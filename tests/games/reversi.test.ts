import { describe, expect, test } from 'bun:test'
import { counts, chooseMove, DIRECTIONS, flipsFor, initialBoard, legalMoves, passTurn, playMove, SKILLS, turnState, type Board, type Side } from '../../src/games/reversi/engine'
import { strings } from '../../src/games/reversi/strings'
import { hintPhase } from '../../src/games/reversi/animation'

describe('Reversi rules', () => {
  test('standard opening gives the player the first four legal moves', () => {
    const board = initialBoard()
    expect(counts(board)).toEqual({ remys: 2, cabald: 2, empty: 60 })
    expect(legalMoves(board, 1)).toEqual([19, 26, 37, 44])
    expect(passTurn(board, 1)).toBeNull()
  })

  for (const [dx, dy] of DIRECTIONS) test(`outflanks direction ${dx},${dy} without mutating the input`, () => {
    const board = new Int8Array(64)
    const origin = 27
    const enemy = (3 + dy) * 8 + 3 + dx
    const anchor = (3 + dy * 2) * 8 + 3 + dx * 2
    board[enemy] = -1
    board[anchor] = 1
    const before = board.slice()
    expect(flipsFor(board, origin, 1)).toEqual([enemy])
    expect(legalMoves(board, 1)).toContain(origin)
    const result = playMove(board, origin, 1)!
    expect(result.board[enemy]).toBe(1)
    expect(counts(result.board)).toEqual({ remys: 3, cabald: 0, empty: 61 })
    expect(board).toEqual(before)
  })

  test('one move captures every direction and every disc of longer lines', () => {
    const board = new Int8Array(64)
    for (const [dx, dy] of DIRECTIONS) {
      board[(3 + dy) * 8 + 3 + dx] = -1
      board[(3 + dy * 2) * 8 + 3 + dx * 2] = -1
      board[(3 + dy * 3) * 8 + 3 + dx * 3] = 1
    }
    expect(flipsFor(board, 27, 1)).toHaveLength(16)
    expect(counts(playMove(board, 27, 1)!.board)).toEqual({ remys: 25, cabald: 0, empty: 39 })
  })

  test('edges never wrap, empty gaps and unterminated lines do not capture', () => {
    const board = new Int8Array(64)
    board[8] = -1
    board[9] = 1
    expect(flipsFor(board, 7, 1)).toEqual([])
    expect(flipsFor(board, -1, 1)).toEqual([])
    expect(flipsFor(board, 64, 1)).toEqual([])
    expect(playMove(board, 9, 1)).toBeNull()
    board.fill(0)
    board[28] = -1
    board[30] = 1
    expect(flipsFor(board, 27, 1)).toEqual([])
    board[30] = 0
    board[29] = -1
    expect(flipsFor(board, 27, 1)).toEqual([])
  })

  test('forced pass, double pass, early end, tie, and final counts', () => {
    const board = new Int8Array(64).fill(-1)
    board[0] = 0
    board[1] = 1
    expect(turnState(board, 1)).toBe('pass')
    expect(passTurn(board, 1)).toBe(-1)
    expect(passTurn(board, -1)).toBeNull()
    const final = playMove(board, 0, -1)!.board
    expect(turnState(final, 1)).toBe('end')
    expect(turnState(final, -1)).toBe('end')
    expect(passTurn(final, 1)).toBeNull()
    expect(counts(final)).toEqual({ remys: 0, cabald: 64, empty: 0 })
    const early = new Int8Array(64)
    early[27] = 1
    expect(turnState(early, 1)).toBe('end')
    const tie = new Int8Array(64).fill(1)
    tie.fill(-1, 32)
    expect(counts(tie)).toEqual({ remys: 32, cabald: 32, empty: 0 })
    expect(turnState(tie, 1)).toBe('end')
  })
})

describe('Reversi AI', () => {
  test('every level returns legal moves and leaves boards unchanged', () => {
    let board = initialBoard()
    let side: Side = 1
    const positions: { board: Board; side: Side }[] = []
    for (let turn = 0; turn < 60 && turnState(board, side) !== 'end'; turn++) {
      const legal = legalMoves(board, side)
      if (!legal.length) { side = -side as Side; continue }
      if (turn === 0 || turn === 15 || counts(board).empty <= 5) positions.push({ board: board.slice(), side })
      board = playMove(board, legal[(turn * 7 + 3) % legal.length], side)!.board
      side = -side as Side
    }
    for (const position of positions) for (const skill of SKILLS) {
      const before = position.board.slice()
      const result = chooseMove(position.board, position.side, skill, { seed: 123 })
      expect(legalMoves(position.board, position.side)).toContain(result.move)
      expect(position.board).toEqual(before)
      expect(chooseMove(position.board, position.side, skill, { seed: 123 })).toEqual(result)
    }
  })

  test('Beginner chooses maximum flips with reproducible per-move seeded randomness', () => {
    const selected = new Set<number | null>()
    for (let seed = 0; seed < 64; seed++) {
      const board = initialBoard()
      const legal = legalMoves(board, 1)
      const maximum = Math.max(...legal.map((move) => flipsFor(board, move, 1).length))
      const result = chooseMove(board, 1, 'beginner', { seed })
      expect(legal).toContain(result.move)
      expect(flipsFor(board, result.move!, 1)).toHaveLength(maximum)
      expect(chooseMove(board, 1, 'beginner', { seed })).toEqual(result)
      selected.add(result.move)
    }
    expect(selected.size).toBe(4)
  })

  test('Beginner mixes move state into the seed instead of retaining the same tie index', () => {
    const opening = initialBoard()
    const later = opening.slice()
    later[0] = 1
    expect(legalMoves(later, 1)).toEqual(legalMoves(opening, 1))
    let changed = 0
    for (let seed = 0; seed < 64; seed++) {
      if (chooseMove(opening, 1, 'beginner', { seed }).move !== chooseMove(later, 1, 'beginner', { seed }).move) changed++
    }
    expect(changed).toBeGreaterThan(0)
  })

  test('Master completes at least six plies even when its injected time expires', () => {
    let time = 0
    const result = chooseMove(initialBoard(), 1, 'master', { now: () => time += 1001 })
    expect(result.depth).toBeGreaterThanOrEqual(6)
    expect(legalMoves(initialBoard(), 1)).toContain(result.move)
    expect(result.exact).toBe(false)
  })

  // Fully specified solved endgames. Values are final disc margins from the side to move.
  const known = [
    { name: 'one empty, player takes the last Cabald disc', rows: ['.CRRRRRR', ...Array(7).fill('RRRRRRRR')], side: 1, score: 64, moves: [0] },
    { name: 'one empty, player must pass and loses every disc', rows: ['.RCCCCCC', ...Array(7).fill('CCCCCCCC')], side: 1, score: -64, moves: [null] },
    { name: 'two empties, computer must play twice around a forced pass', rows: ['.RRCCRR.', ...Array(7).fill('RRRRRRRR')], side: -1, score: -48, moves: [0, 7] },
  ]
  for (const fixture of known) test(`exact Master endgame: ${fixture.name}`, () => {
    const board = Int8Array.from(fixture.rows.join(''), (cell) => cell === 'R' ? 1 : cell === 'C' ? -1 : 0)
    const result = chooseMove(board, fixture.side as Side, 'master')
    expect(result.exact).toBe(true)
    expect(result.score).toBe(fixture.score)
    expect(fixture.moves).toContain(result.move)
  })

  test('Master exact search agrees with exhaustive independent rule oracle on branching endgames', () => {
    function oracle(board: Board, side: Side, passed = false): number {
      const moves: { square: number; flips: number[] }[] = []
      for (let square = 0; square < 64; square++) {
        if (board[square]) continue
        const flips: number[] = []
        for (const [dx, dy] of DIRECTIONS) {
          const line: number[] = []
          let x = square % 8 + dx
          let y = (square >> 3) + dy
          while (x >= 0 && x < 8 && y >= 0 && y < 8 && board[y * 8 + x] === -side) {
            line.push(y * 8 + x)
            x += dx
            y += dy
          }
          if (line.length && x >= 0 && x < 8 && y >= 0 && y < 8 && board[y * 8 + x] === side) flips.push(...line)
        }
        if (flips.length) moves.push({ square, flips })
      }
      if (!moves.length) return passed ? board.reduce((sum, cell) => sum + cell * side, 0) : -oracle(board, -side as Side, true)
      let best = -Infinity
      for (const move of moves) {
        const next = board.slice()
        next[move.square] = side
        for (const square of move.flips) next[square] = side
        best = Math.max(best, -oracle(next, -side as Side))
      }
      return best
    }
    for (const rows of [
      ['.RCCRRC.', 'RRCCRRCR', 'CRRCRCCR', 'RRCRRCRC', 'CCRCRRRC', 'RCRCCRCR', 'RRCCRRCC', '.CCRRCR.'],
      ['.CCRRCR.', 'CRRRCCRC', 'RCCRCRRR', 'CRCCRRCR', 'RRCRCCRC', 'CCRCRRCR', 'RCRRCCRC', '.RCCRRR.'],
      ['..RCCR..', 'RRCCRRCR', 'CRRCRCCR', 'RRCRRCRC', 'CCRCRRRC', 'RCRCCRCR', 'RRCCRRCC', '.CCRRCR.'],
    ]) {
      const board = Int8Array.from(rows.join(''), (cell) => cell === 'R' ? 1 : cell === 'C' ? -1 : 0)
      for (const side of [1, -1] as const) expect(chooseMove(board, side, 'master').score).toBe(oracle(board, side))
    }
  })
})

test('move announcements use player wording and singular/plural disc grammar', () => {
  expect(strings.placed(1, 18, 1)).toBe('You placed at C3; 1 disc flipped.')
  expect(strings.placed(-1, 20, 2)).toBe('The Cabald placed at E3; 2 discs flipped.')
})

test('hint outline blinks three times for 250ms after a completed search, then leaves the cursor', () => {
  expect([0, 249, 250, 499, 500, 749, 750, 999, 1000, 1249, 1250, 1499, 1500].map(hintPhase)).toEqual([
    'on', 'on', 'off', 'off', 'on', 'on', 'off', 'off', 'on', 'on', 'off', 'off', 'done',
  ])
})
