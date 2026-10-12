import { describe, expect, test } from 'bun:test'
import { availableMoves, canDeal, canMove, completeRun, defaults, dealRow, emptyStats, exitAction, hasLegalMoves, hintAt, movable,
  moveCards, newGame, openSavedGame, recordResult, stateGuard, storedGuard, undo, type SpiderState } from '../../src/games/spider/engine'
import type { Card } from '../../src/games/cards/model'
import { spiderHitTest, spiderLayout } from '../../src/games/spider/layout'
import { CARD_W, pileCardPositions } from '../../src/games/cards/model'
import { burstPositions, FIREWORK_PARTICLES } from '../../src/games/spider/fireworks-model'
import { S } from '../../src/games/spider/strings'

const card = (rank: number, suit: Card['suit'] = 'spades', id = rank, faceUp = true): Card => ({ id, rank, suit, faceUp })
function board(piles: Card[][]): SpiderState {
  return { ...newGame(42), piles: [...piles, ...Array.from({ length: 10 - piles.length }, () => [])], stock: [], completed: [], history: [] }
}

describe('Spider XP rules', () => {
  test('104 unique physical cards, 54 dealt and 50 stock, exact difficulty multiplicities', () => {
    for (const difficulty of [1, 2, 4] as const) {
      const s = newGame(123, difficulty)
      expect(s.piles.map(p => p.length)).toEqual([6,6,6,6,5,5,5,5,5,5])
      expect(s.stock.length).toBe(50)
      const cards = [...s.piles.flat(), ...s.stock]
      expect(new Set(cards.map(c => c.id)).size).toBe(104)
      expect(cards.filter(c => c.faceUp).length).toBe(10)
      expect(new Set(cards.map(c => c.suit)).size).toBe(difficulty)
      for (const suit of new Set(cards.map(c => c.suit))) expect(cards.filter(c => c.suit === suit).length).toBe(104 / difficulty)
      expect(stateGuard(s)).toBe(true)
      expect(newGame(123, difficulty)).toEqual(s)
    }
  })
  test('same-suit descending units only, any-suit rank-down destination, empty accepts any run', () => {
    const s = board([[card(7), card(6)], [card(8, 'hearts')], [card(9), card(8, 'hearts')]])
    expect(movable(s, 0, 0)).toBe(true)
    expect(movable(s, 2, 0)).toBe(false)
    expect(canMove(s, { pile: 0, depth: 0, to: 1 })).toBe(true)
    expect(canMove(s, { pile: 0, depth: 0, to: 3 })).toBe(true)
    expect(canMove(s, { pile: 0, depth: 1, to: 1 })).toBe(false)
    expect(canMove(s, { pile: 0, depth: 0, to: 0 })).toBe(false)
    s.piles[0][0].faceUp = false
    expect(movable(s, 0, 0)).toBe(false)
  })
  test('moving exposes and auto-flips top; scores move and multi-level undo separately', () => {
    const s = board([[card(9, 'spades', 9, false), card(7)], [card(8)]])
    const n = moveCards(s, { pile: 0, depth: 1, to: 1 })
    expect(n.piles[0][0].faceUp).toBe(true)
    expect(s.piles[0][0].faceUp).toBe(false)
    expect([n.score, n.moves]).toEqual([499, 1])
    const n2 = moveCards(n, { pile: 1, depth: 1, to: 2 })
    const u = undo(n2)
    expect(u.piles).toEqual(n.piles)
    expect([u.score, u.moves, u.history.length]).toEqual([497, 3, 1])
    const u2 = undo(u)
    expect(u2.piles).toEqual(s.piles)
    expect([u2.score, u2.moves, u2.history.length]).toEqual([496, 4, 0])
    expect(undo(u2)).toBe(u2)
  })
  test('suited K→A automatically removed, +100 and undo barrier', () => {
    const run = Array.from({ length: 12 }, (_, i) => card(13 - i))
    const s = board([[card(5, 'hearts', 60, false), ...run], [card(1)]])
    expect(completeRun([...run, card(1)])).toBe(true)
    expect(completeRun([...run, card(1, 'hearts')])).toBe(false)
    const n = moveCards(s, { pile: 1, depth: 0, to: 0 })
    expect(n.completed.length).toBe(1)
    expect(n.completed[0].map(c => c.rank)).toEqual([13,12,11,10,9,8,7,6,5,4,3,2,1])
    expect(n.piles[0]).toEqual([card(5, 'hearts', 60)])
    expect([n.score, n.moves, n.history.length]).toEqual([599, 1, 0])
    expect(undo(n)).toBe(n)
  })
  test('five face-up rows; empty pile prevents deal without changing state', () => {
    let s = newGame(5)
    for (let row = 0; row < 5; row++) {
      const n = dealRow(s)
      expect(n.stock.length).toBe(40 - row * 10)
      expect(n.piles.every(p => p.at(-1)?.faceUp)).toBe(true)
      expect(n.moves).toBe(row + 1)
      s = n
    }
    expect(canDeal(s)).toBe(false)
    expect(dealRow(s)).toBe(s)
    const blocked = newGame(4)
    blocked.piles[0] = []
    expect(canDeal(blocked)).toBe(false)
    expect(dealRow(blocked)).toBe(blocked)
  })
  test('useful hints cycle deterministically, then offer a deal and a truthful terminal message', () => {
    const s = newGame(9, 2)
    const moves = availableMoves(s)
    expect(availableMoves(s)).toEqual(moves)
    moves.forEach((move, i) => expect(hintAt(s, i)).toEqual({ kind: 'move', move }))
    expect(hintAt(s, moves.length)).toEqual({ kind: 'deal' })
    expect(hintAt(s, moves.length + 1)).toEqual({ kind: 'none', reason: 'finished' })
    const dead = board(Array.from({ length: 10 }, (_, i) => [card(7, 'spades', i)]))
    expect(hintAt(dead, 0)).toEqual({ kind: 'none', reason: 'no-moves' })
    dead.stock = newGame(4).stock
    expect(hintAt(dead, 0)).toEqual({ kind: 'deal' })
    dead.piles[0] = []
    expect(hintAt(dead, availableMoves(dead).length)).toEqual({ kind: 'none', reason: 'no-useful' })
  })
  test('hints discard intact suited suffixes and whole-pile empty moves; suit outranks uncovering', () => {
    const s = board([[card(8), card(7)], [card(8)], [card(8, 'hearts')], [card(9, 'clubs', 20, false), card(7, 'hearts')]])
    const hints = availableMoves(s)
    expect(hints.some(m => m.pile === 0 && m.depth === 1)).toBe(false)
    expect(hints.some(m => m.depth === 0 && !s.piles[m.to].length)).toBe(false)
    const suit = hints.findIndex(m => m.pile === 3 && m.to === 2)
    const reveal = hints.findIndex(m => m.pile === 3 && m.to === 1)
    expect(suit).toBeGreaterThanOrEqual(0)
    const pointless = board([[card(7)]])
    expect(availableMoves(pointless)).toEqual([])
    expect(hasLegalMoves(pointless)).toBe(true)
    expect(reveal).toBeGreaterThan(suit)
  })
  test('streak and accessible card announcements use natural labels', () => {
    expect(S.streakText(-1)).toBe('1 loss')
    expect(S.streakText(2)).toBe('2 wins')
    expect(S.selected(1, 'Ace of Spades')).toContain('Ace of Spades')
    expect(S.moved(1, 2, 499, 'Ace of Spades')).toContain('Ace of Spades')
    expect(S.hintText(1, 2, 'Ace of Spades')).toContain('Ace of Spades')
    expect(S.noPileMoves(4)).toBe('No moves from pile 5.')
  })
  test('Save/Open preserves seed, exact state, move/score/history; corrupt slots rejected', () => {
    const s = dealRow(newGame(0x12345678, 4))
    const stored = { ...defaults(), saved: s }
    const opened = JSON.parse(JSON.stringify(stored))
    expect(storedGuard(opened)).toBe(true)
    expect(opened).toEqual(stored)
    expect(newGame(opened.saved.seed, opened.saved.difficulty)).toEqual(newGame(0x12345678, 4))
    for (const corrupt of [null, {}, { ...stored, options: {} }, { ...stored, stats: {} }, { ...stored, saved: { ...s, moves: -1 } }]) expect(storedGuard(corrupt)).toBe(false)
    const duplicate = JSON.parse(JSON.stringify(stored))
    duplicate.saved.stock[0].id = duplicate.saved.stock[1].id
    expect(storedGuard(duplicate)).toBe(false)
    const foreign = JSON.parse(JSON.stringify(stored))
    foreign.saved.stock[0].suit = 'bananas'
    expect(storedGuard(foreign)).toBe(false)
  })
  test('Open transaction preserves abandoned losses across every difficulty and the exact saved board', () => {
    for (const abandoned of [1, 2, 4] as const) for (const savedDifficulty of [1, 2, 4] as const) {
      const current = dealRow(newGame(123, abandoned))
      const saved = dealRow(newGame(456, savedDifficulty))
      const stored = { ...defaults(), saved }
      stored.stats[abandoned] = recordResult(stored.stats[abandoned], false, 300)
      const opened = openSavedGame(stored, current, false)!
      expect(opened.saved).toBe(saved)
      expect(opened.options).toBe(stored.options)
      expect(opened.stats[abandoned]).toEqual({ high: 499, wins: 0, losses: 2, streak: -2, longestWin: 0, longestLoss: 2 })
      for (const other of [1, 2, 4] as const) if (other !== abandoned) expect(opened.stats[other]).toBe(stored.stats[other])
      expect(stored.stats[abandoned].losses).toBe(1)
      const persisted = JSON.parse(JSON.stringify(opened))
      expect(storedGuard(persisted)).toBe(true)
      expect(persisted.saved).toEqual(saved)
      expect(openSavedGame(persisted, current, true)).toBe(persisted)
      expect(openSavedGame(stored, newGame(123, abandoned), false)).toBe(stored)
      expect(openSavedGame(stored, { ...current, completed: Array.from({ length: 8 }, () => []) }, false)).toBe(stored)
      expect(openSavedGame({ ...stored, saved: null }, current, false)).toBeNull()
    }
  })
  test('fireworks retain 48 particles with eased ragged rings, gravity and every-fourth wavy flag', () => {
    expect(FIREWORK_PARTICLES).toBe(48)
    const x = new Float32Array(FIREWORK_PARTICLES)
    const y = new Float32Array(FIREWORK_PARTICLES)
    burstPositions(x, y, 0, 350, 100, 100)
    expect([...x]).toEqual(Array(48).fill(100))
    expect([...y]).toEqual(Array(48).fill(100))
    burstPositions(x, y, 0, 620, 0, 0)
    expect(x[0]).toBeCloseTo(78 * .78 * .875, 4)
    expect(y[0]).toBeCloseTo(.05 * 18 ** 2, 4)
    burstPositions(x, y, 0, 950, 0, 0)
    const radius = x[0]
    const height = y[0]
    burstPositions(x, y, 0, 1350, 0, 0)
    expect(x[0]).toBe(radius)
    expect(y[0]).toBeGreaterThan(height)
    for (const shell of [3, 7, 11]) {
      burstPositions(x, y, shell, 850, 0, 0)
      const pocketX = [...x]
      const pocketY = [...y]
      expect(new Set(pocketX.map((v, i) => `${v},${pocketY[i]}`)).size).toBe(48)
      for (let pane = 0; pane < 4; pane++) {
        const start = pane * 12
        expect(x[start]).toBeLessThan(x[start + 3])
        expect(y[start]).toBeLessThan(y[start + 8])
        expect(pane % 2 ? x[start] > 0 : x[start] < 0).toBe(true)
        expect(pane >= 2 ? y[start] > 0 : y[start] < 0).toBe(true)
      }
      burstPositions(x, y, shell, 850, 0, 0, 1.4)
      for (let i = 0; i < 48; i++) {
        expect(x[i]).toBeCloseTo(pocketX[i] * 1.4, 4)
        expect(y[i]).toBeCloseTo(pocketY[i] * 1.4, 4)
      }
      burstPositions(x, y, shell, 1450, 0, 0)
      expect(y[0]).toBeGreaterThan(pocketY[0] + 30)
    }
  })
  test('exit Prompt / Always Save / no prompt respects in-progress status', () => {
    const options = defaults().options
    expect(exitAction(options, true)).toBe('prompt')
    expect(exitAction(options, false)).toBe('close')
    expect(exitAction({ ...options, prompt: false, alwaysSave: true }, true)).toBe('save')
    expect(exitAction({ ...options, prompt: false }, true)).toBe('close')
  })
  test('eight completed runs end-to-end; exact save guard and per-difficulty streak statistics', () => {
    let s = newGame(8)
    s.stock = []
    s.piles = Array.from({ length: 10 }, () => [])
    for (let run = 0; run < 8; run++) {
      s.piles[run] = Array.from({ length: 12 }, (_, i) => card(13 - i, 'spades', run * 13 + 12 - i))
      s.piles[8].push(card(1, 'spades', run * 13))
    }
    for (let run = 7; run >= 0; run--) s = moveCards(s, { pile: 8, depth: s.piles[8].length - 1, to: run })
    expect(s.completed.length).toBe(8)
    expect([s.score, s.moves]).toEqual([1292, 8])
    expect(s.history).toEqual([])
    expect(s.piles.every(p => !p.length)).toBe(true)
    expect(stateGuard(s)).toBe(true)
    expect(storedGuard({ ...defaults(), saved: JSON.parse(JSON.stringify(s)) })).toBe(true)
    const stats = defaults().stats
    stats[1] = recordResult(stats[1], true, s.score)
    stats[1] = recordResult(stats[1], true, 1100)
    stats[1] = recordResult(stats[1], false, 300)
    stats[1] = recordResult(stats[1], false, 200)
    expect(stats[1]).toEqual({ high: 1292, wins: 2, losses: 2, streak: -2, longestWin: 2, longestLoss: 2 })
    expect(stats[2]).toEqual(emptyStats())
    expect(storedGuard(JSON.parse(JSON.stringify({ ...defaults(), stats })))).toBe(true)
  })
  test('resize spreads ten integer-native columns without crossing the right edge', () => {
    const s = newGame(4)
    for (const width of [320, 375, 760, 800, 1200]) {
      const l = spiderLayout(s, width, 520, width < 720)
      const xs = l.layouts.map(p => p.x * l.scale)
      expect(l.cardW).toBeGreaterThanOrEqual(32)
      expect(xs[0]).toBeGreaterThanOrEqual(0)
      expect(xs[9] + l.cardW).toBeLessThanOrEqual(width)
      for (let p = 2; p < 10; p++) expect(Math.abs(xs[p] - xs[p - 1] - (xs[1] - xs[0]))).toBeLessThanOrEqual(l.scale + .000001)
    }
    expect(spiderLayout(s, 1200, 520).layouts[1].x).toBeGreaterThan(spiderLayout(s, 800, 520).layouts[1].x)
  })
  test('Pocket portrait uses its height; paging exposes every 32px face strip with deterministic hits', () => {
    const s = newGame(4)
    s.piles[0] = Array.from({ length: 40 }, (_, i) => card(13 - i % 13))
    const l = spiderLayout(s, 390, 740, true)
    expect(l.cardH).toBe(80)
    expect(l.maxScroll[0]).toBeGreaterThan(0)
    for (let depth = 0; depth < s.piles[0].length; depth++) {
      const pages = [Math.min(l.maxScroll[0], depth * 32)]
      const page = spiderLayout(s, 390, 740, true, pages)
      const hit = pileCardPositions(page.layouts[0])[depth]
      const y = hit.y * page.scale + 16
      expect(y).toBeGreaterThanOrEqual(page.top)
      expect(y).toBeLessThan(page.viewBottom)
      expect(spiderHitTest(page, (hit.x + CARD_W / 2) * page.scale, y)?.depth).toBe(depth)
    }
    expect(spiderHitTest(l, 10, l.top - 1)).toBeNull()
  })
  test('landscape height fits cards; long runs page rather than shrinking native fans below twelve', () => {
    const s = newGame(4)
    s.piles[0] = Array.from({ length: 40 }, (_, i) => card(13 - i % 13))
    for (const pocket of [false, true]) {
      const l = spiderLayout(s, pocket ? 844 : 800, pocket ? 274 : 520, pocket)
      const positions = pileCardPositions(l.layouts[0])
      expect(positions[1].y - positions[0].y).toBeGreaterThanOrEqual(12)
      expect((positions.at(-1)!.y + l.cardH / l.scale) * l.scale).toBeLessThanOrEqual(l.viewBottom + .000001)
      expect(l.maxScroll[0]).toBeGreaterThan(0)
      if (pocket) expect(l.scale).toBeLessThan(1)
    }
  })
})
