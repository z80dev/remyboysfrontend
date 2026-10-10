import { describe, expect, test } from 'bun:test'
import {
  advance, createGame, fillRegions, nextLevel, startWall, wallBusy, CELL, CELLS, COLS, HEIGHT, RADIUS, ROWS, WIDTH, type Game,
} from '../../src/games/jezzbald/engine'
import { addScore, defaults, isSettings, qualifies } from '../../src/games/jezzbald/scores'
import { fanfare } from '../../src/games/jezzbald/music/fanfare'

function park(g: Game, x = 40, y = 280) {
  for (let i = 0; i < g.atomCount; i++) {
    g.x[i] = x + i
    g.y[i] = y
    g.vx[i] = 0
    g.vy[i] = 0
  }
  return g
}

function divider(g: Game, column: number) {
  for (let y = 0; y < ROWS; y++) g.cells[y * COLS + column] = 1
}

/** Establish exactly cleared cells, with every atom in the remaining connected right-hand strip. */
function clearedFixture(count: number, level = 1, fast = false) {
  const g = park(createGame(level, 99, fast), WIDTH - 24, HEIGHT - 24)
  // Column-major removal keeps the remaining field connected for all threshold boundary cases.
  for (let i = 0; i < count; i++) g.cells[(i % ROWS) * COLS + Math.floor(i / ROWS)] = 1
  return g
}

describe('JezzBald level rules and deterministic clocks', () => {
  test('level n has exactly n + 1 atoms and lives, with the prescribed time', () => {
    for (const level of [1, 2, 10, 30]) {
      const g = createGame(level, 50)
      expect(g.atomCount).toBe(level + 1)
      expect(g.x.length).toBe(level + 1)
      expect(g.lives).toBe(level + 1)
      expect(g.remaining).toBe((20 * (level + 1) + 40) * 1000)
      expect(g.cells.length).toBe(760)
      expect(g.phase).toBe('playing')
    }
  })

  test('seed and fixed-step frame partitioning give identical simulations', () => {
    const a = createGame(3, 100)
    const b = createGame(3, 100)
    advance(a, 1000)
    for (let i = 0; i < 100; i++) advance(b, 10)
    expect(a.x).toEqual(b.x)
    expect(a.y).toEqual(b.y)
    expect(a.vx).toEqual(b.vx)
    expect(a.vy).toEqual(b.vy)
    expect(a.elapsed).toBe(b.elapsed)
    expect(createGame(3, 101).x).not.toEqual(a.x)
  })

  test('Fast increases speed by precisely 1.5 without changing the initial field', () => {
    const normal = createGame(2, 123)
    const fast = createGame(2, 123, true)
    expect(fast.x).toEqual(normal.x)
    expect(fast.y).toEqual(normal.y)
    for (let i = 0; i < normal.atomCount; i++) {
      expect(fast.vx[i]).toBeCloseTo(normal.vx[i] * 1.5, 10)
      expect(fast.vy[i]).toBeCloseTo(normal.vy[i] * 1.5, 10)
      expect(Math.hypot(normal.vx[i], normal.vy[i])).toBeCloseTo(96)
    }
  })

  test('time expires exactly, freezes the run and cancels growing walls', () => {
    const g = park(createGame())
    g.remaining = 12
    startWall(g, 18, 9, 'horizontal')
    advance(g, 8)
    expect(g.phase).toBe('playing')
    advance(g, 12)
    expect(g.remaining).toBe(0)
    expect(g.elapsed).toBe(12)
    expect(g.phase).toBe('over')
    expect(wallBusy(g)).toBe(false)
    advance(g, 500)
    expect(g.elapsed).toBe(12)
  })

  test('invalid or negative elapsed input never mutates the game', () => {
    const g = createGame()
    for (const ms of [NaN, Infinity, -10, 0]) advance(g, ms)
    expect(g.elapsed).toBe(0)
    expect(g.remaining).toBe(80000)
    expect(g.accumulator).toBe(0)
  })

  test('next level preserves seed, score and Fast, not damage or walls', () => {
    const g = createGame(3, 456, true, 9876)
    g.lives = 1
    g.cells[0] = 1
    const next = nextLevel(g)
    expect(next.level).toBe(4)
    expect(next.atomCount).toBe(5)
    expect(next.lives).toBe(5)
    expect(next.score).toBe(9876)
    expect(next.fast).toBe(true)
    expect(next.seed).toBe(456)
    expect(next.cells.every((cell) => cell === 0)).toBe(true)
  })
})

describe('two independent growing wall halves', () => {
  test('each half grows one cell per 40ms, never at 39ms', () => {
    const g = park(createGame())
    expect(startWall(g, 18, 9, 'horizontal')).toBe(true)
    expect(g.halves[0].length).toBe(CELL / 2)
    advance(g, 39)
    expect(g.halves[0].length).toBe(8)
    expect(g.halves[1].length).toBe(8)
    advance(g, 1)
    expect(g.halves[0].length).toBe(24)
    expect(g.halves[1].length).toBe(24)
    advance(g, 40)
    expect(g.halves[0].length).toBe(40)
    expect(g.halves[1].length).toBe(40)
  })

  test('a shorter red half solidifies while blue keeps growing', () => {
    const g = park(createGame())
    startWall(g, 3, 10, 'horizontal')
    advance(g, 120)
    expect(g.halves[0].completed).toBe(true)
    expect(g.halves[0].active).toBe(false)
    expect(g.halves[1].active).toBe(true)
    expect(g.halves[1].completed).toBe(false)
    for (let x = 0; x <= 3; x++) expect(g.cells[10 * COLS + x]).toBe(1)
    expect(g.cells[10 * COLS + 4]).toBe(0)
    expect(g.cleared).toBe(4)
  })

  test('a blue half can complete before the red half', () => {
    const g = park(createGame())
    startWall(g, 36, 10, 'horizontal')
    advance(g, 40)
    expect(g.halves[1].completed).toBe(true)
    expect(g.halves[0].active).toBe(true)
    expect(g.cells[10 * COLS + 36]).toBe(1)
    expect(g.cells[10 * COLS + 37]).toBe(1)
  })

  test('growth terminates at a filled cell instead of going through it', () => {
    const g = park(createGame())
    g.cells[9 * COLS + 17] = 1
    g.cells[9 * COLS + 22] = 1
    startWall(g, 19, 9, 'horizontal')
    expect(g.halves[0].target).toBe(24)
    expect(g.halves[1].target).toBe(40)
    advance(g, 40)
    expect(g.halves[0].completed).toBe(true)
    expect(g.halves[1].active).toBe(true)
    advance(g, 40)
    expect(g.halves[1].completed).toBe(true)
    expect(g.cells[9 * COLS + 16]).toBe(0)
    expect(g.cells[9 * COLS + 23]).toBe(0)
  })

  test('touching the growing red half destroys only red and removes one life', () => {
    const g = park(createGame())
    g.x[0] = 140
    g.y[0] = 168
    startWall(g, 10, 10, 'horizontal')
    advance(g, 40)
    expect(g.halves[0].active).toBe(false)
    expect(g.halves[0].completed).toBe(false)
    expect(g.halves[1].active).toBe(true)
    expect(g.lives).toBe(1)
    expect(g.losses).toBe(1)
    expect(g.cells[10 * COLS + 9]).toBe(0)
    advance(g, 40)
    expect(g.losses).toBe(1)
    expect(g.halves[1].length).toBe(40)
  })

  test('touching blue destroys only blue, including its would-be completion tick', () => {
    const g = park(createGame())
    g.cells[10 * COLS + 12] = 1
    g.x[0] = 190
    g.y[0] = 168
    startWall(g, 10, 10, 'horizontal')
    advance(g, 40)
    expect(g.halves[1].active).toBe(false)
    expect(g.halves[1].completed).toBe(false)
    expect(g.halves[0].active).toBe(true)
    expect(g.lives).toBe(1)
    expect(g.cells[10 * COLS + 11]).toBe(0)
  })

  test('zero lives ends the game and cancels the surviving half', () => {
    const g = park(createGame())
    g.lives = 1
    g.x[0] = 140
    g.y[0] = 168
    startWall(g, 10, 10, 'horizontal')
    advance(g, 40)
    expect(g.lives).toBe(0)
    expect(g.phase).toBe('over')
    expect(wallBusy(g)).toBe(false)
  })

  test('vertical halves grow and commit up and down independently', () => {
    const g = park(createGame(), 500, 280)
    startWall(g, 10, 2, 'vertical')
    advance(g, 80)
    expect(g.halves[0].completed).toBe(true)
    expect(g.halves[1].active).toBe(true)
    for (let y = 0; y <= 2; y++) expect(g.cells[y * COLS + 10]).toBe(1)
    expect(g.cells[3 * COLS + 10]).toBe(0)
  })

  test('new builds reject busy, filled, out-of-bounds and non-cell positions', () => {
    const g = park(createGame())
    g.cells[0] = 1
    for (const [x, y] of [[0, 0], [-1, 5], [38, 5], [5, 20], [5, -1], [1.5, 1], [NaN, 1]]) {
      expect(startWall(g, x, y, 'vertical')).toBe(false)
    }
    expect(startWall(g, 10, 10, 'horizontal')).toBe(true)
    expect(startWall(g, 20, 5, 'vertical')).toBe(false)
    expect(g.wallX).toBe(10)
    expect(g.starts).toBe(1)
  })
})

describe('atom-free region flood, area and scores', () => {
  test('only the region without any atoms fills', () => {
    const g = park(createGame(), 300, 200)
    divider(g, 10)
    expect(fillRegions(g)).toBe(11 * ROWS)
    expect(g.cleared).toBe(220)
    expect(g.area).toBe(Math.floor(220 / CELLS * 100))
    expect(g.score).toBe(220)
    expect(g.cells[0]).toBe(1)
    expect(g.cells[37]).toBe(0)
  })

  test('regions with different atoms both remain open', () => {
    const g = park(createGame(), 300, 200)
    g.x[0] = 30
    divider(g, 10)
    expect(fillRegions(g)).toBe(ROWS)
    expect(g.cells[0]).toBe(0)
    expect(g.cells[37]).toBe(0)
    expect(g.score).toBe(ROWS)
  })

  test('the flood does not wrap across a row or connect diagonal cells', () => {
    const g = park(createGame(), 8, 8)
    g.cells.fill(1)
    g.cells[0] = 0
    g.cells[COLS + 1] = 0
    g.cells[COLS - 1] = 0
    g.cells[COLS] = 0
    g.x[1] = 8
    g.y[1] = 8
    fillRegions(g)
    expect(g.cells[0]).toBe(0)
    expect(g.cells[COLS]).toBe(0)
    // (1,1) shares an edge with (0,1), so stays open; the row-end cell has no such connection.
    expect(g.cells[COLS + 1]).toBe(0)
    expect(g.cells[COLS - 1]).toBe(1)
    const diagonal = park(createGame(), 8, 8)
    diagonal.cells.fill(1)
    diagonal.cells[0] = diagonal.cells[COLS + 1] = 0
    fillRegions(diagonal)
    expect(diagonal.cells[COLS + 1]).toBe(1)
  })

  test('a second identical flood cannot award the same cells twice', () => {
    const g = park(createGame(2), 300, 200)
    divider(g, 10)
    fillRegions(g)
    expect(g.score).toBe(440)
    expect(fillRegions(g)).toBe(0)
    expect(g.score).toBe(440)
  })

  test('a finished wall triggers its own flood and fill scoring', () => {
    const g = park(createGame(), 300, 280)
    startWall(g, 18, 10, 'horizontal')
    advance(g, 760)
    expect(g.halves[0].completed).toBe(true)
    expect(g.halves[1].completed).toBe(true)
    expect(g.cleared).toBe(COLS * 11)
    expect(g.score).toBe(COLS * 11)
    expect(g.phase).toBe('playing')
  })

  test('the exact 75% threshold clears, while one fewer cell does not', () => {
    const below = clearedFixture(569)
    fillRegions(below)
    expect(below.phase).toBe('playing')
    expect(below.area).toBe(74)
    const exact = clearedFixture(570)
    fillRegions(exact)
    expect(exact.phase).toBe('complete')
    expect(exact.area).toBe(75)
    expect(exact.tally.area).toBe(0)
    expect(exact.tally.lives).toBe(1000)
    expect(exact.tally.time).toBe(1600)
    expect(exact.tally.total).toBe(2600)
    expect(exact.score).toBe(570 + 2600)
  })

  test('area bonus begins at exactly 80%, with all level multipliers', () => {
    const below = clearedFixture(607, 3)
    fillRegions(below)
    expect(below.area).toBe(79)
    expect(below.tally.area).toBe(0)
    const exact = clearedFixture(608, 3)
    exact.lives = 2
    exact.remaining = 34500
    fillRegions(exact)
    expect(exact.area).toBe(80)
    expect(exact.tally.area).toBe(5 * 1000 * 3)
    expect(exact.tally.lives).toBe(2 * 500 * 3)
    expect(exact.tally.time).toBe(35 * 20 * 3)
    expect(exact.tally.total).toBe(20100)
    expect(exact.score).toBe(608 * 3 + 20100)
    const score = exact.score
    fillRegions(exact)
    expect(exact.score).toBe(score)
  })

  test('Fast doubles fill points and every completion bonus', () => {
    const normal = clearedFixture(646, 2)
    const fast = clearedFixture(646, 2, true)
    normal.remaining = fast.remaining = 19000
    normal.lives = fast.lives = 2
    fillRegions(normal)
    fillRegions(fast)
    expect(normal.area).toBe(85)
    expect(normal.tally.area).toBe(20000)
    expect(fast.tally.area).toBe(normal.tally.area * 2)
    expect(fast.tally.lives).toBe(normal.tally.lives * 2)
    expect(fast.tally.time).toBe(normal.tally.time * 2)
    expect(fast.score).toBe(normal.score * 2)
  })
})

describe('continuous atom collision at normal and Fast speeds', () => {
  test('outer corners reflect both components, with squash axis reported', () => {
    const g = park(createGame(1, 99, true))
    g.x[0] = g.y[0] = RADIUS + 0.1
    g.vx[0] = g.vy[0] = -100
    advance(g, 4)
    expect(g.vx[0]).toBe(100)
    expect(g.vy[0]).toBe(100)
    expect(g.bounceAxis[0]).toBe(3)
    expect(g.x[0]).toBeGreaterThanOrEqual(RADIUS)
    expect(g.y[0]).toBeGreaterThanOrEqual(RADIUS)
  })

  test('a Fast atom never tunnels through a one-cell wall in a long frame', () => {
    const g = park(createGame(1, 9, true), 100, 200)
    divider(g, 12)
    g.x[0] = 170
    g.vx[0] = 144 / Math.SQRT2
    g.vy[0] = 144 / Math.SQRT2
    advance(g, 500)
    expect(g.x[0]).toBeLessThan(12 * CELL - RADIUS)
    expect(g.vx[0]).toBeLessThan(0)
    expect(g.phase).toBe('playing')
  })

  test('adaptive swept microsteps also prevent tunneling at extreme test speeds', () => {
    const g = park(createGame(), 140, 200)
    divider(g, 12)
    g.vx[0] = 20000
    advance(g, 4)
    expect(g.x[0]).toBeLessThan(12 * CELL - RADIUS)
    expect(g.vx[0]).toBeLessThan(0)
  })

  test('a flat wall reflects only its normal velocity, preserving speed', () => {
    const g = park(createGame(), 12 * CELL - RADIUS - 0.1, 180)
    divider(g, 12)
    g.vx[0] = 100
    g.vy[0] = 50
    advance(g, 4)
    expect(g.vx[0]).toBe(-100)
    expect(g.vy[0]).toBe(50)
    expect(g.bounceAxis[0]).toBe(1)
    expect(Math.hypot(g.vx[0], g.vy[0])).toBeCloseTo(Math.hypot(100, 50))
  })

  test('diagonal contact with a solid-cell corner reflects both axes', () => {
    const g = park(createGame(), 154.9, 154.9)
    g.cells[10 * COLS + 10] = 1
    g.vx[0] = g.vy[0] = 100
    advance(g, 4)
    expect(g.vx[0]).toBe(-100)
    expect(g.vy[0]).toBe(-100)
    expect(g.bounceAxis[0]).toBe(3)
  })

  test('an atom crossing a growing wall is caught without crossing to the other side', () => {
    const g = park(createGame(3), 500, 280)
    g.x[0] = 120
    g.y[0] = 142
    g.vx[0] = 0
    g.vy[0] = 20000
    startWall(g, 10, 10, 'horizontal')
    g.halves[0].length = 100
    advance(g, 4)
    expect(g.losses).toBe(1)
    expect(g.halves[0].active).toBe(false)
    expect(g.halves[1].active).toBe(true)
  })
})

describe('high scores, guarded settings and original audio', () => {
  test('foreign, corrupt and unbounded persisted values are rejected', () => {
    for (const value of [null, [], {}, { ...defaults, fast: 1 }, { ...defaults, scores: [{ name: 'a', score: NaN }] },
      { ...defaults, scores: [{ name: 'a', score: -1 }] }, { ...defaults, scores: [{ name: 'a'.repeat(33), score: 1 }] },
      { ...defaults, scores: Array.from({ length: 11 }, () => ({ name: 'a', score: 1 })) }]) expect(isSettings(value)).toBe(false)
    expect(isSettings(defaults)).toBe(true)
    expect(isSettings({ fast: true, reveal: false, scores: [{ name: 'Remy Boy', score: 500 }] })).toBe(true)
  })

  test('top ten are descending, trimmed, capped, immutable and strictly qualified', () => {
    const scores = Array.from({ length: 10 }, (_, i) => ({ score: 100 - i, name: `Player ${i}` }))
    const result = addScore(scores, 200, `  ${'R'.repeat(40)}  `)
    expect(result.length).toBe(10)
    expect(result[0]).toEqual({ score: 200, name: 'R'.repeat(32) })
    expect(result[9].score).toBe(92)
    expect(scores[0].score).toBe(100)
    expect(qualifies(scores, 91)).toBe(false)
    expect(qualifies(scores, 92)).toBe(true)
    expect(qualifies([], 0)).toBe(false)
    expect(qualifies([], 1)).toBe(true)
  })

  test('victory fanfare is original song data with a sub-three-second score', () => {
    expect(fanfare.length / fanfare.stepsPerBeat * 60 / fanfare.bpm).toBeLessThanOrEqual(3)
    expect(fanfare.loopStart).toBe(fanfare.length)
    expect(fanfare.parts.length).toBeGreaterThan(0)
    for (const part of fanfare.parts) for (const [step, , length] of part.notes) {
      expect((step + length) / fanfare.stepsPerBeat * 60 / fanfare.bpm).toBeLessThanOrEqual(3)
    }
  })
})
