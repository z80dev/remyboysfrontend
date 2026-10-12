import { describe, expect, test } from 'bun:test'
import {
  CELLS, COLS, CONNECTIONS, DEFAULT_PREFERENCES, VALVE_OUTLETS, addHighScore, advanceTo, createGame, fastFlow, followingLevel,
  levelForPassword, levelParameters, nextCell, opposite, passwordForLevel, pipeExit, placePiece, sanitizePreferences, slidePiece, validPreferences
} from '../../src/games/pipe-dream/engine'
import type { Direction, HighScore, Piece, PipeGame } from '../../src/games/pipe-dream/engine'

function fixture(pipes: Record<number, Piece> = {}, level = 1, source = 31, outlet: Direction = 1): PipeGame {
  const game = createGame(123, level)
  game.board = Array<Piece>(CELLS).fill('empty')
  game.board[source] = 'source'
  for (const [index, piece] of Object.entries(pipes)) game.board[Number(index)] = piece
  game.filled.fill(0)
  game.placed.fill(false)
  game.portals = []
  game.source = source
  game.head = source
  game.outlet = outlet
  game.entry = opposite(outlet)
  game.axis = outlet % 2 === 1 ? 1 : 2
  game.exit = outlet
  game.deadline = 0
  return game
}
function finish(game: PipeGame): PipeGame { return advanceTo(game, 1000000) }

describe('Pipe Dream connectivity', () => {
  const expected: Record<string, (number | null)[]> = {
    horizontal: [null, 3, null, 1], vertical: [2, null, 0, null], ne: [1, 0, null, null], se: [null, 2, 1, null],
    sw: [null, null, 3, 2], nw: [3, null, null, 0], cross: [2, 3, 0, 1],
    'reservoir-h': [null, 3, null, 1], 'reservoir-v': [2, null, 0, null], 'valve-n': [null, null, 0, null],
    'valve-e': [null, null, null, 1], 'valve-s': [2, null, null, null], 'valve-w': [null, 3, null, null],
    source: [null, null, null, null], empty: [null, null, null, null], block: [null, null, null, null], drain: [0, 1, 2, 3]
  }
  for (const [piece, exits] of Object.entries(expected)) test(`${piece} preserves all fixed ports`, () => {
    for (let entry = 0; entry < 4; entry++) expect(pipeExit(piece as Piece, entry as Direction)).toBe(exits[entry])
    expect(CONNECTIONS[piece as Piece].every(port => port >= 0 && port <= 3)).toBe(true)
  })
})

describe('Pure deterministic flow', () => {
  test('generation is seeded and includes the fixed level features', () => {
    expect(createGame(917, 13)).toEqual(createGame(917, 13))
    for (const level of [1, 3, 5, 7, 9, 13]) {
      const game = createGame(123, level)
      expect(game.board.filter(piece => piece === 'source')).toHaveLength(1)
      expect(game.queue).toHaveLength(5)
      if (level >= 3) expect(game.board.filter(piece => piece === 'block').length).toBeGreaterThan(0)
      if (level >= 5) expect(game.board.some(piece => piece.startsWith('reservoir'))).toBe(true)
      if (level >= 7) expect(game.board.some(piece => piece.startsWith('valve'))).toBe(true)
      if (level >= 9) expect(game.board.includes('drain')).toBe(true)
      expect(game.portals.length).toBe(level >= 13 ? 2 : 0)
    }
  })
  test('all four Vault outlets have a valid three-cell runway reserved from every fixed feature', () => {
    const outlets = new Set<Direction>()
    for (let seed = 0; seed < 256; seed++) {
      for (const level of [1, 7, 13, 1000]) {
        const game = createGame(seed, level)
        outlets.add(game.outlet)
        expect(game.head).toBe(game.source)
        expect(game.entry).toBe(opposite(game.outlet))
        expect(game.exit).toBe(game.outlet)
        expect(game.axis).toBe(game.outlet % 2 === 1 ? 1 : 2)
        let cell = game.source
        for (let step = 0; step < 3; step++) {
          const previous = cell
          cell = nextCell(game, cell, game.outlet)
          expect(cell).toBeGreaterThanOrEqual(0)
          expect(cell).toBeLessThan(CELLS)
          expect(Math.abs(cell % COLS - previous % COLS) + Math.abs(Math.floor(cell / COLS) - Math.floor(previous / COLS))).toBe(1)
          expect(game.board[cell]).toBe('empty')
        }
      }
      const bonus = createGame(seed, 4, 0, true)
      let cell = bonus.source
      for (let step = 0; step < 3; step++) {
        cell = nextCell(bonus, cell, bonus.outlet)
        expect(cell).toBeGreaterThanOrEqual(0)
        expect(cell).toBeLessThan(CELLS)
      }
      expect(bonus.board[bonus.source]).toBe('source')
    }
    expect([...outlets].sort()).toEqual([0, 1, 2, 3])
  })
  test('every valve orientation is generated, with two valves and no runway obstruction', () => {
    const orientations = new Set<Piece>()
    for (let seed = 0; seed < 256; seed++) {
      const game = createGame(seed, 7)
      const valves = game.board.filter(piece => piece.startsWith('valve-'))
      expect(valves).toHaveLength(2)
      for (const valve of valves) orientations.add(valve)
    }
    expect([...orientations].sort()).toEqual(['valve-e', 'valve-n', 'valve-s', 'valve-w'])
  })
  test('the Vault feeds only its selected outlet in every direction', () => {
    const cells = [21, 32, 41, 30]
    for (let direction = 0; direction < 4; direction++) {
      const outlet = direction as Direction
      const piece = direction % 2 === 0 ? 'vertical' : 'horizontal'
      const game = fixture({ [cells[direction]]: piece }, 1, 31, outlet)
      const flowing = advanceTo(game, 0)
      expect(flowing.head).toBe(cells[direction])
      expect(flowing.entry).toBe(opposite(outlet))
      expect(flowing.exit).toBe(outlet)
      expect(finish(flowing).length).toBe(1)
      const wrongSide = fixture({ [cells[(direction + 2) % 4]]: piece }, 1, 31, outlet)
      expect(finish(wrongSide).length).toBe(0)
    }
  })
  test('countdown and unchanged animation frames allocate no new state', () => {
    const game = createGame(5)
    expect(advanceTo(game, 19999)).toBe(game)
    const frozen = JSON.stringify(game)
    const started = advanceTo(game, 20000)
    expect(started).not.toBe(game)
    expect(JSON.stringify(game)).toBe(frozen)
  })
  test('open ends, mismatches, blocks, and edges stop the flow', () => {
    for (const piece of ['empty', 'vertical', 'block'] as Piece[]) {
      const ended = finish(fixture({ 32: piece }))
      expect(ended.phase).toBe('failed')
      expect(ended.length).toBe(0)
    }
    const edge = finish(fixture({ 39: 'horizontal' }, 1, 38))
    expect(edge.length).toBe(1)
    expect(edge.phase).toBe('failed')
    expect(edge.score).toBe(50)
  })
  test('normal filled pieces cannot be traversed again from a different port', () => {
    const game = fixture({ 32: 'nw' }, 1, 22, 2)
    game.filled[32] = 1
    expect(finish(game).length).toBe(0)
  })
  test('a real loop traverses a cross on both independent axes exactly once', () => {
    const game = fixture({ 32: 'cross', 33: 'sw', 43: 'nw', 42: 'ne', 22: 'vertical', 12: 'vertical', 2: 'vertical' })
    const ended = finish(game)
    expect(ended.filled[32]).toBe(3)
    expect(ended.crosses).toBe(1)
    expect(ended.length).toBe(8)
    expect(ended.score).toBe(900)
    expect(ended.phase).toBe('failed')
    const blocked = fixture({ 32: 'cross' })
    blocked.filled[32] = 1
    expect(finish(blocked).length).toBe(0)
  })
  test('reservoirs take three section durations and award 200 extra', () => {
    const game = fixture({ 32: 'reservoir-h' }, 5)
    const flowing = advanceTo(game, 0)
    expect(flowing.duration).toBe(4500)
    expect(advanceTo(flowing, 4499)).toBe(flowing)
    const ended = advanceTo(flowing, 4500)
    expect(ended.length).toBe(1)
    expect(ended.score).toBe(250)
    expect(ended.events).toContain('reservoir')
  })
  test('every one-way valve accepts only entry opposite its arrow, including generated south and west valves', () => {
    const neighbors = [22, 33, 42, 31]
    for (const [piece, outlet] of Object.entries(VALVE_OUTLETS)) {
      for (let entry = 0; entry < 4; entry++) {
        const game = fixture({ 32: piece as Piece }, 7, neighbors[entry], opposite(entry as Direction))
        const ended = finish(game)
        expect(ended.length).toBe(entry === opposite(outlet) ? 1 : 0)
        if (entry === opposite(outlet)) expect(ended.filled[32]).toBe(entry % 2 === 1 ? 1 : 2)
      }
    }
  })
  test('a short drain route still fails while awarding its 1000-point bonus exactly once', () => {
    const ended = finish(fixture({ 32: 'drain' }, 9))
    expect(ended.phase).toBe('failed')
    expect(ended.length).toBe(1)
    expect(ended.score).toBe(1050)
    expect(ended.events).toContain('fail')
    expect(ended.events).not.toContain('pass')
    expect(advanceTo(ended, 2000000)).toBe(ended)
  })
  test('the Pool passes only at Distance or beyond, with normal, Fast Flow and over-distance points intact', () => {
    const pipes: Record<number, Piece> = {}
    for (let index = 1; index < 30; index++) pipes[index] = 'horizontal'
    pipes[9] = 'sw'
    pipes[19] = 'nw'
    pipes[10] = 'se'
    pipes[20] = 'ne'
    pipes[29] = 'sw'
    pipes[39] = 'drain'
    const exact = finish(fixture(pipes, 9, 0))
    expect(exact.length).toBe(30)
    expect(exact.phase).toBe('passed')
    expect(exact.score).toBe(2500)
    expect(exact.events.filter(event => event === 'distance')).toHaveLength(1)
    expect(exact.events).toContain('pass')
    const short = finish(fixture({ ...pipes, 29: 'drain' }, 9, 0))
    expect(short.length).toBe(29)
    expect(short.phase).toBe('failed')
    expect(short.score).toBe(2450)
    expect(short.events).not.toContain('distance')
    const beyond = finish(fixture({ ...pipes, 39: 'nw', 38: 'drain' }, 9, 0))
    expect(beyond.length).toBe(31)
    expect(beyond.phase).toBe('passed')
    expect(beyond.score).toBe(2600)
    const fast = finish(fastFlow(fixture(pipes, 9, 0), 0))
    expect(fast.phase).toBe('passed')
    expect(fast.score).toBe(4000)
  })
  test('edge portals wrap only matching edges in both directions', () => {
    const game = fixture({ 39: 'horizontal', 30: 'horizontal', 31: 'drain' }, 13, 38)
    game.portals = [{ a: 39, direction: 1, b: 30 }]
    expect(nextCell(game, 39, 1)).toBe(30)
    expect(nextCell(game, 30, 3)).toBe(39)
    expect(nextCell(game, 9, 1)).toBe(-1)
    const ended = finish(game)
    expect(ended.length).toBe(3)
    expect(ended.phase).toBe('failed')
    const vertical = fixture({ 3: 'vertical', 63: 'drain' }, 13, 13, 0)
    vertical.portals = [{ a: 3, direction: 0, b: 63 }]
    expect(nextCell(vertical, 3, 0)).toBe(63)
    expect(nextCell(vertical, 63, 2)).toBe(3)
    expect(finish(vertical).length).toBe(2)
  })
  test('meeting Distance passes even without a drain', () => {
    const game = fixture({ 11: 'horizontal', 12: 'horizontal', 13: 'horizontal', 14: 'horizontal', 15: 'horizontal', 16: 'sw',
      26: 'vertical', 36: 'nw', 35: 'horizontal', 34: 'horizontal', 33: 'horizontal', 32: 'horizontal', 31: 'horizontal', 30: 'horizontal' }, 1, 10)
    const ended = finish(game)
    expect(ended.length).toBe(14)
    expect(ended.phase).toBe('passed')
    expect(ended.score).toBe(700)
    expect(ended.events.filter(event => event === 'distance')).toHaveLength(1)
  })
})

describe('Placement and scoring', () => {
  test('the bottom of five dispenser pieces is consumed without rotation', () => {
    const game = fixture()
    game.deadline = 20000
    game.queue = ['vertical', 'ne', 'se', 'nw', 'horizontal']
    const placed = placePiece(game, 4, 0)
    expect(placed.board[4]).toBe('horizontal')
    expect(placed.queue.slice(1)).toEqual(['vertical', 'ne', 'se', 'nw'])
    expect(placed.queue).toHaveLength(5)
    expect(game.board[4]).toBe('empty')
    expect(placed.score).toBe(0)
  })
  test('replacement charges once, locks every cell for 250ms, then installs the queued piece', () => {
    const game = fixture({ 4: 'horizontal' })
    game.deadline = 20000
    game.placed[4] = true
    game.queue[4] = 'ne'
    const replaced = placePiece(game, 4, 100)
    expect(replaced.score).toBe(-50)
    expect(replaced.board[4]).toBe('horizontal')
    expect(replaced.replacement?.until).toBe(350)
    expect(placePiece(replaced, 5, 349)).toBe(replaced)
    expect(placePiece(replaced, 4, 349)).toBe(replaced)
    const finished = advanceTo(replaced, 350)
    expect(finished.replacement).toBeNull()
    expect(finished.board[4]).toBe('ne')
    expect(finished.score).toBe(-50)
    expect(placePiece(finished, 5, 350).board[5]).not.toBe('empty')
  })
  test('filled, filling, fixed and source cells cannot be replaced', () => {
    const game = fixture({ 32: 'horizontal', 5: 'block', 6: 'reservoir-h', 7: 'valve-e', 8: 'drain' }, 9)
    game.placed[32] = true
    const flowing = advanceTo(game, 0)
    for (const index of [31, 32, 5, 6, 7, 8]) expect(placePiece(flowing, index, 100)).toBe(flowing)
    flowing.filled[10] = 1
    flowing.board[10] = 'horizontal'
    flowing.placed[10] = true
    expect(placePiece(flowing, 10, 100)).toBe(flowing)
    for (const index of [-1, 70, 3.5]) expect(placePiece(flowing, index, 100)).toBe(flowing)
  })
  test('Fast Flow is permanent, starts the flow, preserves the current meniscus and doubles sections', () => {
    const game = fixture({ 32: 'horizontal', 33: 'drain' }, 9)
    game.deadline = 20000
    const fast = fastFlow(game, 10)
    expect(fast.fast).toBe(true)
    expect(fast.phase).toBe('flow')
    expect(fast.duration).toBe(levelParameters(9).section / 8)
    expect(fastFlow(fast, 11)).toBe(fast)
    expect(finish(fast).score).toBe(1200)
    const normal = advanceTo(fixture({ 32: 'horizontal' }), 0)
    const sped = fastFlow(normal, normal.duration / 2)
    expect((normal.duration / 2 - sped.started) / sped.duration).toBeCloseTo(.5)
  })
  test('over-distance sections double, combining with Fast Flow; reaching Distance emits a sting', () => {
    const game = fixture({ 32: 'horizontal' })
    game.length = 14
    expect(finish(game).score).toBe(100)
    expect(finish(fastFlow(game, 0)).score).toBe(200)
    game.length = 13
    const reached = finish(game)
    expect(reached.score).toBe(50)
    expect(reached.events).toContain('distance')
  })
  test('the fifth distinct crossover awards 500 plus 10000 exactly once', () => {
    const game = fixture({ 32: 'cross' }, 1, 42, 0)
    game.filled[32] = 1
    game.crosses = 4
    const ended = finish(game)
    expect(ended.crosses).toBe(5)
    expect(ended.score).toBe(10550)
    expect(advanceTo(ended, 2000000)).toBe(ended)
    game.crosses = 5
    expect(finish(game).score).toBe(550)
  })
  test('unused placed pipes cost 100 each, but fixed features and filled pipes do not', () => {
    const game = fixture({ 32: 'drain', 4: 'horizontal', 5: 'vertical', 6: 'reservoir-h', 7: 'block' }, 9)
    game.placed[4] = true
    game.placed[5] = true
    game.placed[32] = true
    expect(finish(game).score).toBe(850)
  })
})

describe('Progression, bonus rounds, passwords and scores', () => {
  test('all formulas and floors are exact', () => {
    expect(levelParameters(1)).toEqual({ distance: 14, countdown: 20000, section: 1900, obstacles: 0 })
    expect(levelParameters(3)).toEqual({ distance: 18, countdown: 18000, section: 1700, obstacles: 3 })
    expect(levelParameters(14)).toEqual({ distance: 40, countdown: 7000, section: 600, obstacles: 6 })
    expect(levelParameters(15)).toEqual({ distance: 40, countdown: 6000, section: 500, obstacles: 7 })
    expect(levelParameters(100).distance).toBe(40)
    expect(levelParameters(100).countdown).toBe(6000)
    expect(levelParameters(100).section).toBe(500)
  })
  test('every fourth normal level enters a bonus round and then the following level', () => {
    for (const level of [1, 3, 4, 8, 12]) {
      const game = fixture({}, level)
      game.phase = 'passed'
      game.score = 1234
      const next = followingLevel(game)
      expect(next.bonus).toBe(level % 4 === 0)
      expect(next.level).toBe(level % 4 === 0 ? level : level + 1)
      expect(next.score).toBe(1234)
      if (next.bonus) {
        expect(next.deadline).toBe(15000)
        expect(next.board.filter(piece => piece === 'empty')).toHaveLength(1)
        next.phase = 'bonus-end'
        expect(followingLevel(next).level).toBe(level + 1)
        expect(followingLevel(next).bonus).toBe(false)
      }
    }
  })
  test('bonus slides require orthogonal adjacency and cannot move the source or flowing tiles', () => {
    const game = fixture({}, 4)
    game.bonus = true
    game.deadline = 15000
    game.duration = 15000
    game.board.fill('horizontal')
    game.board[game.source] = 'source'
    game.gap = 34
    game.board[34] = 'empty'
    game.source = 31
    const slid = slidePiece(game, 35, 10)
    expect(slid.gap).toBe(35)
    expect(slid.board[34]).toBe(game.board[35])
    expect(slid.board[35]).toBe('empty')
    expect(slid.events).toEqual(['slide'])
    expect(game.gap).toBe(34)
    for (const index of [34, 36, 45, 31, -1, 70]) expect(slidePiece(game, index, 10)).toBe(game)
    game.gap = 30
    expect(slidePiece(game, 29, 10)).toBe(game)
    expect(slidePiece(game, 31, 10)).toBe(game)
    game.gap = 34
    game.filled[35] = 1
    expect(slidePiece(game, 35, 10)).toBe(game)
    game.filled[35] = 0
    game.phase = 'flow'
    game.head = 35
    expect(slidePiece(game, 35, 10)).toBe(game)
    expect(placePiece(game, 35, 10)).toBe(game)
  })
  test('bonus flow always scores 100 per section, without normal bonuses or unused penalties', () => {
    const game = fixture({ 32: 'cross' }, 4, 42, 0)
    game.bonus = true
    game.filled[32] = 1
    game.placed[5] = true
    game.board[5] = 'horizontal'
    const ended = finish(game)
    expect(ended.phase).toBe('bonus-end')
    expect(ended.score).toBe(100)
    expect(ended.crosses).toBe(0)
    game.deadline = 15000
    expect(fastFlow(game, 0)).toBe(game)
  })
  test('all 17575 scrambled four-letter passwords are unique and reversible', () => {
    const words = new Set<string>()
    for (let level = 5; level <= 70301; level += 4) {
      const word = passwordForLevel(level)!
      expect(word).toMatch(/^[A-Z]{4}$/)
      expect(levelForPassword(word)).toBe(level)
      expect(words.has(word)).toBe(false)
      words.add(word)
    }
    expect(words.size).toBe(17575)
  })
  test('the scrambled format is stable and its unused zero-round code is refused', () => {
    expect(passwordForLevel(5)).toBe('MWRQ')
    expect(levelForPassword('MWRQ')).toBe(5)
    expect(levelForPassword('QWCB')).toBeNull()
  })
  test('passwords normalize case and whitespace, reject every single-letter typo, and reject legacy sequential codes', () => {
    for (const level of [5, 9, 13, 17, 101, 1001, 10001, 70301]) {
      const word = passwordForLevel(level)!
      expect(levelForPassword(` ${word.toLowerCase()} `)).toBe(level)
      for (let index = 0; index < 4; index++) {
        for (let letter = 65; letter <= 90; letter++) {
          if (word.charCodeAt(index) === letter) continue
          expect(levelForPassword(word.slice(0, index) + String.fromCharCode(letter) + word.slice(index + 1))).toBeNull()
        }
      }
    }
    for (const input of ['', '1234', 'ABCDE', 'A B C D', 'AAAB', 'NSSV', 'NXZR', 'ODGV', 'OINR']) expect(levelForPassword(input)).toBeNull()
    for (const level of [1, 4, 6, 70305, 5.5, NaN, Infinity, -Infinity]) expect(passwordForLevel(level)).toBeNull()
  })
  test('neighboring bonus passwords do not retain the former arithmetic sequence', () => {
    const deltas = new Set<number>()
    for (let level = 5; level < 101; level += 4) {
      const current = passwordForLevel(level)!
      const next = passwordForLevel(level + 4)!
      const currentValue = (current.charCodeAt(0) - 65) * 676 + (current.charCodeAt(1) - 65) * 26 + current.charCodeAt(2) - 65
      const nextValue = (next.charCodeAt(0) - 65) * 676 + (next.charCodeAt(1) - 65) * 26 + next.charCodeAt(2) - 65
      deltas.add((nextValue - currentValue + 17576) % 17576)
    }
    expect(deltas.size).toBeGreaterThan(1)
  })
  test('top ten scores sort descending and names are trimmed and limited', () => {
    let scores: HighScore[] = []
    for (let i = 0; i < 14; i++) scores = addHighScore(scores, `  Player ${i}  `, i * 100, i + 1)
    expect(scores).toHaveLength(10)
    expect(scores[0]).toEqual({ name: 'Player 13', score: 1300, level: 14 })
    expect(scores[9].score).toBe(400)
    expect(addHighScore([], 'X'.repeat(100), 50, 1)[0].name).toHaveLength(32)
    const fullName = '12345678901234567890123456789012'
    const named = addHighScore([], `  ${fullName}  `, 1050, 9)
    expect(named[0].name).toBe(fullName)
    expect(validPreferences({ grid: false, scores: named, passwords: [] })).toBe(true)
  })
  test('stale passwords are removed without losing the grid option or a 950-point score', () => {
    const saved = { grid: true, scores: [{ name: 'Remy Reviewer', score: 950, level: 2 }], passwords: ['NSSV'] }
    expect(validPreferences(saved)).toBe(true)
    const clean = sanitizePreferences(saved)
    expect(clean).toEqual({ grid: true, scores: saved.scores, passwords: [] })
    expect(clean.scores).toBe(saved.scores)
    expect(saved.passwords).toEqual(['NSSV'])
    expect(levelForPassword('NSSV')).toBeNull()
    expect(sanitizePreferences(clean)).toBe(clean)
    const current = passwordForLevel(9)!
    const mixed = sanitizePreferences({ ...saved, passwords: ['NSSV', current, 'AAAB', 'ODGV'] })
    expect(mixed.passwords).toEqual([current])
    expect(mixed.scores).toBe(saved.scores)
    expect(validPreferences(mixed)).toBe(true)
  })
  test('storage rejects corrupt or foreign schemas and retains valid scores and passwords', () => {
    expect(validPreferences(DEFAULT_PREFERENCES)).toBe(true)
    expect(validPreferences({ grid: true, scores: [{ name: 'Remy', score: 42, level: 9 }], passwords: [passwordForLevel(9)] })).toBe(true)
    for (const value of [null, [], {}, { grid: true, scores: 'bad', passwords: [] }, { grid: true, scores: [{ name: 3, score: 4, level: 1 }], passwords: [] },
      { grid: false, scores: [], passwords: [42] }, { grid: false, scores: [], passwords: [null] },
      { grid: false, scores: [null], passwords: [] },
      { grid: false, scores: [{ name: 'R', score: Infinity, level: 1 }], passwords: [] }]) expect(validPreferences(value)).toBe(false)
  })
})
