import { describe, expect, test } from 'bun:test'
import { isDoubleClick, makeDeck, type Card, type Suit } from '../../src/games/cards/model'
import { autoHome, canMove, canRecycle, cheatWin, deal, DEFAULT_OPTIONS, draw, flip, home, move, pile, tick, undo, vegasBank, winBonus,
  type Options, type State } from '../../src/games/solitaire/engine'
import { createCascade, stepCascade } from '../../src/games/solitaire/cascade'
import { boardScale, dealOrder, layouts, positions } from '../../src/games/solitaire/layout'
let id = 100
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
  test('every Ace can seed each physical home; suit/order/single top and returns', () => {
    for (const suit of ['clubs', 'diamonds', 'hearts', 'spades'] as const) {
      for (let target = 2; target < 6; target++) {
        const s = board(); s.waste = [card(1, suit)]
        expect(canMove(s, { pile: 1, depth: 0 }, target)).toBe(true)
        const n = move(s, { pile: 1, depth: 0 }, target)
        n.waste = [card(2, suit)]
        expect(canMove(n, { pile: 1, depth: 0 }, target)).toBe(true)
        expect(home(n, { pile: 1, depth: 0 }).homes[target - 2].map(c => c.rank)).toEqual([1, 2])
        n.waste = [card(3, suit)]
        expect(canMove(n, { pile: 1, depth: 0 }, target)).toBe(false)
        n.waste = [card(2, suit === 'clubs' ? 'hearts' : 'clubs')]
        expect(canMove(n, { pile: 1, depth: 0 }, target)).toBe(false)
        n.waste = [card(1, suit)]
        for (let empty = 2; empty < 6; empty++) {
          expect(canMove(n, { pile: 1, depth: 0 }, empty)).toBe(false)
        }
        const empty = target === 2 ? 3 : 2
        const transferred = move(n, { pile: target, depth: 0 }, empty)
        expect(transferred.homes[target - 2]).toEqual([])
        expect(transferred.homes[empty - 2]).toEqual(n.homes[target - 2])
        expect(undo(transferred).homes).toEqual(n.homes)
        n.tableau[0] = [card(2, suit === 'clubs' || suit === 'spades' ? 'hearts' : 'clubs')]
        const returned = move(n, { pile: target, depth: 0 }, 6)
        expect(returned.homes[target - 2]).toEqual([])
        expect(undo(returned).homes).toEqual(n.homes)
        n.tableau[1] = [card(1, 'clubs'), card(13, 'hearts')]
        expect(canMove(n, { pile: 7, depth: 0 }, target)).toBe(false)
      }
    }
    const s = board(); s.waste = [card(2)]
    expect(canMove(s, { pile: 1, depth: 0 }, 2)).toBe(false)
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
  test('repeated Ace home relocation never earns Standard points or Vegas bank', () => {
    for (const scoring of ['standard', 'vegas'] as const) {
      const initial = board({ scoring, keep: true })
      initial.homes[0] = [card(1, 'hearts')]
      initial.seconds = 42
      let s = initial
      for (let i = 0; i < 12; i++) {
        const source = i % 4
        const target = (i + 1) % 4
        const n = move(s, { pile: source + 2, depth: 0 }, target + 2)
        expect(n).not.toBe(s)
        expect(n.homes[source]).toEqual([])
        expect(n.homes[target]).toEqual(s.homes[source])
        expect(n.score).toBe(initial.score)
        expect(n.seconds).toBe(initial.seconds)
        expect(undo(n)).toEqual({ ...s, undo: null })
        s = n
      }
      expect(s.homes).toEqual(initial.homes)
    }
  })
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
  test('Vegas Keep bank survives Standard scoring and charges the true balance on return', () => {
    const options: Options = { ...DEFAULT_OPTIONS, scoring: 'vegas', keep: true }
    let vegas = deal(1, options, 100)
    vegas.waste = [card(1, 'hearts')]
    vegas = home(vegas, { pile: 1, depth: 0 })
    const bank = vegasBank(vegas, 100)
    expect(bank).toBe(53)
    let standard = deal(2, { ...options, scoring: 'standard' }, bank)
    standard.waste = [card(1, 'clubs')]
    standard.tableau[0] = [card(7, 'diamonds', false)]
    standard = flip(home(standard, { pile: 1, depth: 0 }), { pile: 6, depth: 0 })
    expect(standard.score).toBe(15)
    expect(vegasBank(standard, bank)).toBe(53)
    expect(deal(3, options, vegasBank(standard, bank)).score).toBe(1)
    const cleared = vegasBank({ ...standard, options: { ...options, keep: false }, score: 999 }, bank)
    expect(cleared).toBe(0)
    expect(deal(4, options, cleared).score).toBe(-52)
    expect(vegasBank({ ...standard, options: { ...standard.options, keep: false } }, bank)).toBe(53)
    expect(vegasBank({ ...standard, options: { ...options, scoring: 'none' }, score: 0 }, bank)).toBe(53)
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
    expect(n.homes[0].length).toBe(2); expect(n.homes[1].length).toBe(1); expect(n.score).toBe(230)
    const u = undo(n); expect(u.homes.flat().length).toBe(2); expect(u.score).toBe(220); expect(undo(u)).toBe(u)
    expect(autoHome(n)).toBe(n)
  })
  test('reordered homes guide direct home and repeated auto-home with single-step undo', () => {
    const s = board(); s.seconds = 31
    s.homes[3] = [card(1, 'clubs')]; s.homes[1] = [card(1, 'spades')]
    s.waste = [card(2, 'clubs')]
    const direct = home(s, { pile: 1, depth: 0 })
    expect(direct.homes[3].map(c => c.rank)).toEqual([1, 2])
    expect(undo(direct)).toEqual({ ...s, undo: null })
    s.tableau[0] = [card(2, 'spades')]
    s.tableau[1] = [card(1, 'hearts')]
    const n = autoHome(s)
    expect(n.homes.map(p => p[0]?.suit)).toEqual(['hearts', 'spades', undefined, 'clubs'])
    expect(n.homes.map(p => p.length)).toEqual([1, 2, 0, 2])
    expect(n.score).toBe(230); expect(n.seconds).toBe(31)
    const u = undo(n)
    expect(u.homes[0]).toEqual([]); expect(u.tableau[1]).toEqual(s.tableau[1])
    expect(u.score).toBe(220); expect(u.seconds).toBe(31)
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
  test('cheat preserves bound physical slots and fills unused suits uniquely', () => {
    const s = board({ scoring: 'vegas' })
    s.homes[0] = [card(1, 'hearts')]; s.homes[1] = [card(1, 'spades')]
    s.homes[3] = [card(1, 'clubs')]
    const n = cheatWin(s)
    expect(n.homes.map(p => p[0].suit)).toEqual(['hearts', 'spades', 'diamonds', 'clubs'])
    expect(n.homes.every(p => p.length === 13)).toBe(true)
    expect(new Set(n.homes.flat().map(c => c.id)).size).toBe(52)
    expect(n.score).toBe(200 + 49 * 5)
    expect(undo(n)).toEqual({ ...s, undo: null })
    const simulation = createCascade(585, n.homes, () => .5)
    expect(simulation.homes).toEqual([1, 2, 3, 0])
    for (let i = 0; i < 52; i++) {
      const slot = simulation.homes[simulation.index % 4]
      const face = n.homes[slot][12 - Math.floor(simulation.index / 4)]
      expect(face.rank).toBe(13 - Math.floor(i / 4))
      expect(slot).toBe((1 + i) % 4)
      if (i === 0) expect(face.suit).toBe('spades')
      expect(simulation.x).toBe(11 + (slot + 3) * 82)
      simulation.x = 586; simulation.vx = 2
      stepCascade(simulation, 585, 400, () => .5)
    }
    expect(simulation.done).toBe(true)
  })
})

describe('Solitaire Pocket geometry and row-major dealing', () => {
  test('portrait keeps the exact seven-column card width and uses taller face-up fans', () => {
    const state = board()
    state.tableau[0] = [card(13), card(12, 'hearts'), card(11)]
    const scale = boardScale(state, 390, 708, true)
    expect(71 * scale).toBeCloseTo((390 - 8 * 11) / 7)
    const portrait = positions(state, 390 / scale, 708 / scale, true).filter(hit => hit.pile === 6)
    const desktop = positions(state, 585, 388, false).filter(hit => hit.pile === 6)
    expect(portrait[1].y - portrait[0].y).toBeGreaterThan(desktop[1].y - desktop[0].y)
    expect(layouts(state, 585, 388, false)[6].x).toBe(11)
  })
  test('844 by 390 Pocket landscape fits six down and thirteen up without clipping', () => {
    const state = board()
    state.tableau[6] = [
      ...Array.from({ length: 6 }, () => card(5, 'clubs', false)),
      ...Array.from({ length: 13 }, (_, i) => card(13 - i, i % 2 ? 'hearts' : 'clubs'))
    ]
    const feltHeight = 254
    const scale = boardScale(state, 844, feltHeight, true)
    expect(scale).toBeLessThan(1)
    for (const hit of positions(state, 844 / scale, feltHeight / scale, true)) {
      expect(hit.x * scale).toBeGreaterThanOrEqual(0)
      expect((hit.x + 71) * scale).toBeLessThanOrEqual(844)
      expect((hit.y + 96) * scale).toBeLessThanOrEqual(feltHeight + .000001)
    }
    expect(boardScale(state, 844, feltHeight, false)).toBe(1)
  })
  test('deal visits all twenty-eight tableau cards by row, never animating the stock', () => {
    const hits = dealOrder(positions(deal(123), 585, 388, false))
    expect(hits.length).toBe(28)
    expect(new Set(hits.map(hit => hit.card!.id)).size).toBe(28)
    expect(hits.slice(0, 7).map(hit => [hit.depth, hit.pile])).toEqual(Array.from({ length: 7 }, (_, i) => [0, i + 6]))
    expect(hits.slice(7, 13).map(hit => [hit.depth, hit.pile])).toEqual(Array.from({ length: 6 }, (_, i) => [1, i + 7]))
    expect(hits.at(-1)?.depth).toBe(6)
    expect(hits.at(-1)?.pile).toBe(12)
  })
})

describe('Solitaire XP cascade physics', () => {
  test('spade King first, cycling K to A and real signed launch velocities', () => {
    const homes = cheatWin(board()).homes
    const negative = createCascade(585, homes, () => 0)
    const positive = createCascade(585, homes, () => .999)
    expect(negative.homes).toEqual([3, 0, 1, 2])
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
    const s = createCascade(585, cheatWin(board()).homes, () => .5)
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

describe('Solitaire interaction boundaries and unscored clocks', () => {
  test('Windows double-click accepts 500 ms inclusive and requires the same card', () => {
    expect(isDoubleClick({ time: 10, key: '6:2:18' }, '6:2:18', 510)).toBe(true)
    expect(isDoubleClick({ time: 10, key: '6:2:18' }, '6:2:18', 511)).toBe(false)
    expect(isDoubleClick({ time: 10, key: '6:2:18' }, '6:2:19', 20)).toBe(false)
    expect(isDoubleClick(null, '6:2:18', 20)).toBe(false)
  })
  test('None recycling is free and both nonstandard modes ignore timed decay', () => {
    const none = board({ scoring: 'none', draw: 3, timed: true })
    none.score = 0
    none.waste = [card(1)]
    expect(draw(none).score).toBe(0)
    none.started = true
    expect(tick(none, 100).score).toBe(0)
    const vegas = board({ scoring: 'vegas', timed: true })
    vegas.started = true
    vegas.score = -52
    expect(tick(vegas, 100).score).toBe(-52)
  })
})
