import { describe, expect, test } from 'bun:test'
import { availableMoves, canDeal, canMove, completeRun, defaults, dealRow, emptyStats, exitAction, hintAt, movable,
  moveCards, newGame, recordResult, stateGuard, storedGuard, undo, type SpiderState } from '../../src/games/spider/engine'
import type { Card } from '../../src/games/cards/model'

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
  test('all hints deterministic then deal or no available moves', () => {
    const s = newGame(9, 2)
    const moves = availableMoves(s)
    expect(availableMoves(s)).toEqual(moves)
    moves.forEach((move, i) => expect(hintAt(s, i)).toEqual({ kind: 'move', move }))
    expect(hintAt(s, moves.length)).toEqual({ kind: 'deal' })
    const dead = board(Array.from({ length: 10 }, (_, i) => [card(7, 'spades', i)]))
    expect(hintAt(dead, 0)).toEqual({ kind: 'none' })
    dead.stock = newGame(4).stock
    expect(hintAt(dead, 0)).toEqual({ kind: 'deal' })
    dead.piles[0] = []
    expect(hintAt(dead, availableMoves(dead).length)).toEqual({ kind: 'none' })
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
})
