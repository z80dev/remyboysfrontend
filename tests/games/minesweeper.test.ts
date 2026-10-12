import { describe, expect, test } from 'bun:test'
import {
  FLAG, HIDDEN, LEVELS, QUESTION, REVEALED, calculateNumbers, chordCell, chordPreview, clampCustom, createGame, cycleMark,
  flagCount, mineCounter, neighbors, reveal, tick, touchCell,
} from '../../src/games/minesweeper/engine'
import type { Config, Game } from '../../src/games/minesweeper/engine'

// Explicit layouts exercise rules, not a simulated UI or a replacement random generator.
function field(rows: number, cols: number, positions: number[]): Game {
  const config: Config = { rows, cols, mines: positions.length }
  const game = createGame(config, 4490)
  const mines = new Uint8Array(rows * cols)
  for (const index of positions) mines[index] = 1
  return { ...game, mines, numbers: calculateNumbers(config, mines) }
}

describe('Minesweeper field generation', () => {
  test('standard dimensions, counts, and deterministic seeds', () => {
    for (const [level, dimensions] of Object.entries({ beginner: [9, 9, 10], intermediate: [16, 16, 40], expert: [16, 30, 99] })) {
      const config = LEVELS[level as keyof typeof LEVELS]
      expect([config.rows, config.cols, config.mines]).toEqual(dimensions)
      const a = createGame(config, 1990)
      const b = createGame(config, 1990)
      expect([...a.mines].reduce((sum, value) => sum + value, 0)).toBe(config.mines)
      expect(a.cells.length).toBe(config.rows * config.cols)
      expect(a.mines).toEqual(b.mines)
      expect(a.numbers).toEqual(b.numbers)
      expect(a.cells.every((cell) => cell === HIDDEN)).toBe(true)
      expect(a.seconds).toBe(0)
      expect(a.exploded.size).toBe(0)
    }
    expect(createGame(LEVELS.expert, 1).mines).not.toEqual(createGame(LEVELS.expert, 2).mines)
  })

  test('eight-neighbor counts do not wrap across edges', () => {
    const g = field(3, 3, [0, 2, 8])
    expect(neighbors(g.config, 0)).toEqual([1, 3, 4])
    expect(neighbors(g.config, 4)).toHaveLength(8)
    expect(g.numbers[4]).toBe(3)
    expect(g.numbers[6]).toBe(0)
    expect(g.numbers[7]).toBe(1)
  })

  test('Custom bounds clamp dimensions before computing the mine maximum', () => {
    expect(clampCustom(1, 100, 999)).toEqual({ rows: 9, cols: 30, mines: 232 })
    expect(clampCustom(100, 100, 999)).toEqual({ rows: 24, cols: 30, mines: 667 })
    expect(clampCustom(9, 9, 100)).toEqual({ rows: 9, cols: 9, mines: 64 })
    expect(clampCustom(9, 9, -1)).toEqual({ rows: 9, cols: 9, mines: 10 })
    expect(clampCustom(12.9, 20.8, 88.9)).toEqual({ rows: 12, cols: 20, mines: 88 })
    expect(clampCustom(NaN, Infinity, NaN)).toEqual({ rows: 9, cols: 9, mines: 10 })
  })
})

describe('Minesweeper first reveal and flood fill', () => {
  test('a first-click mine moves to the first top-left non-mine, not a random safe cell', () => {
    const before = field(9, 9, [0, 1, 4, 80])
    const after = reveal(before, 80)
    expect(after.mines[80]).toBe(0)
    expect(after.mines[2]).toBe(1)
    expect(after.mines[0]).toBe(1)
    expect(after.mines[1]).toBe(1)
    expect([...after.mines].reduce((a, b) => a + b, 0)).toBe(4)
    expect(after.numbers).toEqual(calculateNumbers(after.config, after.mines))
    expect(after.status).not.toBe('lost')
    expect(after.seconds).toBe(1)
    expect(before.mines[80]).toBe(1)
    expect(before.cells[80]).toBe(HIDDEN)
  })

  test('a safe first click leaves the mine positions unchanged', () => {
    const before = field(3, 3, [0])
    const after = reveal(before, 1)
    expect(after.mines).toBe(before.mines)
    expect(after.seconds).toBe(1)
    expect(after.status).toBe('playing')
    const loss = reveal(after, 0)
    expect(loss.status).toBe('lost')
    expect([...loss.exploded]).toEqual([0])
    expect(after.exploded.size).toBe(0)
  })

  test('flags before the first reveal do not start the clock or bypass first-click safety', () => {
    const before = cycleMark(field(3, 3, [8]), 0, true)
    expect(before.status).toBe('ready')
    expect(before.seconds).toBe(0)
    expect(reveal(before, 0)).toBe(before)
    const after = reveal(before, 8)
    expect(after.mines[0]).toBe(1)
    expect(after.mines[8]).toBe(0)
    expect(after.cells[0]).toBe(FLAG)
    expect(after.status).toBe('won')
  })

  test('iterative flood fills a maximum-size empty field and auto-wins', () => {
    const before = field(24, 30, [])
    const after = reveal(before, 719)
    expect(after.cells.every((cell) => cell === REVEALED)).toBe(true)
    expect(after.status).toBe('won')
    expect(before.cells.every((cell) => cell === HIDDEN)).toBe(true)
  })

  test('flood reveals adjacent numbered boundary cells but leaves mines and flags alone', () => {
    let g = field(5, 5, [0])
    g = cycleMark(g, 24, true)
    const after = reveal(g, 12)
    expect(after.cells[0]).toBe(HIDDEN)
    expect(after.cells[1]).toBe(REVEALED)
    expect(after.cells[5]).toBe(REVEALED)
    expect(after.cells[6]).toBe(REVEALED)
    expect(after.cells[24]).toBe(FLAG)
    expect(after.status).toBe('playing')
    const unflagged = cycleMark(cycleMark(after, 24, true), 24, true)
    expect(reveal(unflagged, 24).status).toBe('won')
  })

  test('question marks can be revealed and filled; out-of-range clicks do nothing', () => {
    let g = field(3, 3, [0])
    g = cycleMark(cycleMark(g, 8, true), 8, true)
    expect(g.cells[8]).toBe(QUESTION)
    expect(reveal(g, 8).cells[8]).toBe(REVEALED)
    expect(reveal(g, -1)).toBe(g)
    expect(reveal(g, 9)).toBe(g)
  })
})

describe('Minesweeper marks and chording', () => {
  test('Marks on cycles blank → flag → question → blank; off skips question', () => {
    const initial = field(3, 3, [0])
    const flagged = cycleMark(initial, 8, true)
    const question = cycleMark(flagged, 8, true)
    expect(flagged.cells[8]).toBe(FLAG)
    expect(question.cells[8]).toBe(QUESTION)
    expect(cycleMark(question, 8, true).cells[8]).toBe(HIDDEN)
    expect(cycleMark(flagged, 8, false).cells[8]).toBe(HIDDEN)
    expect(cycleMark(question, 8, false).cells[8]).toBe(HIDDEN)
    expect(initial.cells[8]).toBe(HIDDEN)
  })

  test('counter can go negative and clamps at −99; questions do not count as flags', () => {
    let g = field(24, 30, [0])
    for (let i = 0; i < 150; i++) g = cycleMark(g, i, true)
    expect(flagCount(g)).toBe(150)
    expect(mineCounter(g)).toBe(-99)
    g = field(3, 3, [0])
    g = cycleMark(cycleMark(g, 1, true), 2, true)
    expect(mineCounter(g)).toBe(-1)
    g = cycleMark(g, 2, true)
    expect(mineCounter(g)).toBe(0)
  })

  test('held chord preview excludes revealed cells and flags', () => {
    let g = reveal(field(3, 3, [0]), 4)
    g = cycleMark(g, 0, true)
    expect(chordPreview(g, 4)).toEqual([1, 2, 3, 5, 6, 7, 8])
    expect(chordPreview(g, -1)).toEqual([])
  })

  test('held chord preview includes a hidden or questioned centre but never a flagged centre', () => {
    const hidden = field(3, 3, [0])
    expect(chordPreview(hidden, 4)).toEqual([4, 0, 1, 2, 3, 5, 6, 7, 8])
    const flagged = cycleMark(hidden, 4, true)
    expect(chordPreview(flagged, 4)).toEqual([0, 1, 2, 3, 5, 6, 7, 8])
    const question = cycleMark(flagged, 4, true)
    expect(chordPreview(question, 4)).toEqual([4, 0, 1, 2, 3, 5, 6, 7, 8])
    expect(chordPreview(hidden, 0)).toEqual([0, 1, 3, 4])
  })

  test('a correctly flagged satisfied number chords and auto-flags all mines on victory', () => {
    let g = reveal(field(3, 3, [0]), 4)
    g = cycleMark(g, 0, true)
    const after = chordCell(g, 4)
    expect(after.status).toBe('won')
    expect(after.cells[0]).toBe(FLAG)
    expect(after.cells.slice(1).every((cell) => cell === REVEALED)).toBe(true)
    expect(mineCounter(after)).toBe(0)
    expect(g.cells[1]).toBe(HIDDEN)
  })

  test('an incorrect-flag chord steps every neighbour, including safe cells after every exploded mine', () => {
    let g = reveal(field(3, 3, [0, 2, 6]), 4)
    g = cycleMark(cycleMark(cycleMark(g, 1, true), 3, true), 6, true)
    g = cycleMark(cycleMark(g, 2, true), 2, true)
    const before = [...g.cells]
    const after = chordCell(g, 4)
    expect(after.status).toBe('lost')
    expect([...after.exploded]).toEqual([0, 2])
    expect([...after.cells]).toEqual([REVEALED, FLAG, REVEALED, FLAG, REVEALED, REVEALED, FLAG, REVEALED, REVEALED])
    expect(after.cells[6]).toBe(FLAG)
    expect(after.exploded.has(6)).toBe(false)
    expect([...g.cells]).toEqual(before)
    expect(g.exploded.size).toBe(0)
    expect(tick(after)).toBe(after)
  })

  test('touching a satisfied number chords in either mode and with either hold action', () => {
    const g = cycleMark(reveal(field(3, 3, [0]), 4), 0, true)
    for (const marking of [false, true]) {
      for (const marks of [false, true]) {
        const after = touchCell(g, 4, marking, marks)
        expect(after.status).toBe('won')
        expect(after.cells[0]).toBe(FLAG)
        expect(after.cells.slice(1).every((cell) => cell === REVEALED)).toBe(true)
      }
    }
    expect(g.status).toBe('playing')
  })

  test('touch mode only exchanges reveal and marking on covered cells', () => {
    const g = field(3, 3, [0])
    expect(touchCell(g, 4, true, true).cells[4]).toBe(FLAG)
    expect(touchCell(g, 4, false, true).cells[4]).toBe(REVEALED)
    const flagged = touchCell(g, 4, true, true)
    expect(touchCell(flagged, 4, true, true).cells[4]).toBe(QUESTION)
    expect(touchCell(flagged, 4, true, false).cells[4]).toBe(HIDDEN)
    expect(touchCell(g, -1, true, true)).toBe(g)
    expect(touchCell(g, 9, false, true)).toBe(g)
  })

  test('unsatisfied, hidden, and zero-cell chords do nothing', () => {
    const initial = field(3, 3, [0])
    expect(chordCell(initial, 4)).toBe(initial)
    const number = reveal(initial, 4)
    expect(chordCell(number, 4)).toBe(number)
    const flaggedTwice = cycleMark(cycleMark(number, 0, true), 8, true)
    expect(chordCell(flaggedTwice, 4)).toBe(flaggedTwice)
    const zero = reveal(field(3, 3, [0, 8]), 2)
    expect(zero.status).toBe('playing')
    expect(zero.numbers[2]).toBe(0)
    expect(chordCell(zero, 2)).toBe(zero)
    expect(cycleMark(number, 4, true)).toBe(number)
  })
})

describe('Minesweeper end state and clock boundaries', () => {
  test('the last safe square wins even if no mines were manually flagged', () => {
    const after = reveal(field(3, 3, [0]), 8)
    expect(after.status).toBe('won')
    expect(after.cells[0]).toBe(FLAG)
    expect(mineCounter(after)).toBe(0)
  })

  test('won and lost boards ignore all further reveal/mark/chord input', () => {
    const won = reveal(field(3, 3, [0]), 8)
    const lost = reveal(reveal(field(3, 3, [0]), 4), 0)
    for (const game of [won, lost]) {
      expect(reveal(game, 1)).toBe(game)
      expect(cycleMark(game, 1, true)).toBe(game)
      expect(chordCell(game, 4)).toBe(game)
      expect(tick(game)).toBe(game)
      expect(chordPreview(game, 4)).toEqual([])
    }
  })

  test('ready does not tick; first reveal starts at 1; running time caps at 999', () => {
    const ready = field(3, 3, [0])
    expect(tick(ready)).toBe(ready)
    const playing = reveal(ready, 4)
    expect(playing.seconds).toBe(1)
    expect(tick(playing).seconds).toBe(2)
    const almost = { ...playing, seconds: 998 }
    const capped = tick(almost)
    expect(capped.seconds).toBe(999)
    expect(tick(capped)).toBe(capped)
    expect(almost.seconds).toBe(998)
  })
})
