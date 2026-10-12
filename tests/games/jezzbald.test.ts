import { describe, expect, spyOn, test } from 'bun:test'
import {
  advance, createGame, fillRegions, nextLevel, startWall, wallBusy, CELL, CELLS, COLS, HEIGHT, RADIUS, ROWS, WIDTH, type Game,
} from '../../src/games/jezzbald/engine'
import { addScore, defaults, isSettings, qualifies } from '../../src/games/jezzbald/scores'
import { fanfare } from '../../src/games/jezzbald/music/fanfare'
import { longPressWall, moveCursor, newRunSeed, pointCursor, type Cursor } from '../../src/games/jezzbald/input'
import { CONTROL_HEIGHT, STATUS_HEIGHT, fitField } from '../../src/games/jezzbald/layout'
import { draw, drawPixelCursor, type Painter } from '../../src/games/jezzbald/render'
import { strings as s } from '../../src/games/jezzbald/strings'

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

  test('atoms and lives cap at 50, while the clock keeps using the actual level', () => {
    for (const level of [49, 50, 100]) {
      const g = createGame(level, 50)
      expect(g.atomCount).toBe(50)
      expect(g.lives).toBe(50)
      for (const pool of [g.x, g.y, g.vx, g.vy, g.contact, g.bounceAt, g.bounceAxis]) expect(pool.length).toBe(50)
      expect(g.remaining / 1000).toBe(20 * (level + 1) + 40)
    }
    expect(createGame(100).remaining / 1000).toBe(2060)
  })

  test('each UI run requests fresh entropy without changing deterministic engine seeding', () => {
    let seed = 1000
    const entropy = spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
      const words = array as Uint32Array
      words[0] = ++seed
      return array
    })
    try {
      const first = createGame(1, newRunSeed())
      const second = createGame(1, newRunSeed())
      expect(entropy).toHaveBeenCalledTimes(2)
      expect(first.seed).toBe(1001)
      expect(second.seed).toBe(1002)
      expect(first.x).not.toEqual(second.x)
      expect(createGame(1, first.seed).x).toEqual(first.x)
      expect(nextLevel(first).seed).toBe(first.seed)
    } finally {
      entropy.mockRestore()
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

  test('pending Fast is applied only to the next level, for both motion and scoring', () => {
    const g = clearedFixture(608, 2)
    fillRegions(g)
    expect(g.fast).toBe(false)
    expect(g.tally.area).toBe(10000)
    expect(g.tally.lives).toBe(3000)
    expect(g.tally.time).toBe(4000)
    const next = nextLevel(g, true)
    expect(next.fast).toBe(true)
    expect(next.seed).toBe(g.seed)
    expect(next.score).toBe(g.score)
    expect(Math.hypot(next.vx[0], next.vy[0])).toBeCloseTo(144)
    expect(g.fast).toBe(false)
    const normal = nextLevel(next, false)
    expect(normal.fast).toBe(false)
    expect(Math.hypot(normal.vx[0], normal.vy[0])).toBeCloseTo(96)
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

  test('a seeded centre-contact episode costs one life across subsequent moving ticks, then rearms after leaving', () => {
    const g = park(createGame(1, 1992))
    g.x[0] = 168
    g.y[0] = 168
    g.vy[0] = 96
    startWall(g, 10, 10, 'horizontal')
    advance(g, 4)
    expect(g.losses).toBe(1)
    expect(g.lives).toBe(1)
    expect(g.contact[0]).toBe(1)
    expect(g.halves[0].active).toBe(false)
    expect(g.halves[1].active).toBe(true)
    advance(g, 76)
    expect(g.losses).toBe(1)
    expect(g.lives).toBe(1)
    expect(g.phase).toBe('playing')
    expect(g.halves[1].active).toBe(true)
    expect(g.halves[1].length).toBe(40)
    advance(g, 120)
    expect(g.contact[0]).toBe(0)
    expect(g.losses).toBe(1)
    g.vy[0] = -96
    advance(g, 80)
    expect(g.losses).toBe(2)
    expect(g.lives).toBe(0)
    expect(g.phase).toBe('over')
  })

  test('stationary seam contact cannot kill the sibling on a later 4ms tick', () => {
    const g = park(createGame(1, 1992), 168, 168)
    g.x[1] = 500
    g.y[1] = 280
    startWall(g, 10, 10, 'horizontal')
    advance(g, 200)
    expect(g.losses).toBe(1)
    expect(g.lives).toBe(1)
    expect(g.phase).toBe('playing')
    expect(g.halves[1].active).toBe(true)
    expect(g.halves[1].length).toBe(88)
  })

  test('a seed-contact loss followed by a one-cell sibling commit never embeds or floods the moving atom', () => {
    const g = park(createGame(2), 500, 200)
    g.x[0] = 243
    g.y[0] = 308
    g.vx[0] = 50
    g.vy[0] = -40
    expect(startWall(g, 15, 19, 'vertical')).toBe(true)
    advance(g, 4)
    expect(g.halves[0].completed).toBe(false)
    expect(g.halves[0].active).toBe(false)
    expect(g.halves[1].completed).toBe(true)
    expect(g.halves[1].target).toBe(CELL / 2)
    expect(g.losses).toBe(1)
    expect(g.lives).toBe(2)
    expect(g.cells[19 * COLS + 15]).toBe(0)
    expect(g.cleared).toBe(0)
    // No relocation, immunity, or velocity suppression: the same atom takes its ordinary first physics step.
    expect(g.x[0]).toBeCloseTo(243.2)
    expect(g.y[0]).toBeCloseTo(307.84)
    expect(g.vx[0]).toBe(50)
    expect(g.vy[0]).toBe(-40)

    expect(startWall(g, 20, 10, 'vertical')).toBe(true)
    advance(g, 400)
    expect(g.halves.every((half) => half.completed)).toBe(true)
    expect(g.x[0]).toBeGreaterThan(260)
    expect(g.y[0]).toBeLessThan(300)
    expect(g.cells[18 * COLS + 15]).toBe(0)
    expect(g.cells[0]).toBe(0)
    expect(g.cells[COLS - 1]).toBe(0)
    expect(g.cleared).toBe(ROWS)
    expect(g.losses).toBe(1)
    expect(g.phase).toBe('playing')
  })

  test('a short horizontal sibling cannot embed an atom centred in or merely overlapping the seed', () => {
    for (const x of [595, 587]) {
      const g = park(createGame(2), 500, 200)
      g.x[0] = x
      g.y[0] = 165
      g.vx[0] = -50
      g.vy[0] = -40
      expect(startWall(g, COLS - 1, 10, 'horizontal')).toBe(true)
      advance(g, 4)
      expect(g.halves[0].active).toBe(false)
      expect(g.halves[1].completed).toBe(true)
      expect(g.cells[10 * COLS + COLS - 1]).toBe(0)
      expect(g.x[0]).toBeCloseTo(x - 0.2)
      expect(g.y[0]).toBeCloseTo(164.84)
      advance(g, 100)
      expect(g.x[0]).toBeCloseTo(x - 5.2)
      expect(g.y[0]).toBeCloseTo(160.84)
      expect(g.losses).toBe(1)
      expect(g.cleared).toBe(0)
      expect(g.phase).toBe('playing')
    }
  })

  test('contact latches are per atom, not a global immunity for the surviving half', () => {
    const g = park(createGame(2), 168, 168)
    g.x[1] = 184
    g.x[2] = 500
    g.y[2] = 280
    startWall(g, 10, 10, 'horizontal')
    advance(g, 40)
    expect(g.losses).toBe(2)
    expect(g.lives).toBe(1)
    expect(g.phase).toBe('playing')
    expect(wallBusy(g)).toBe(false)
  })

  test('touching blue destroys only blue, including its would-be completion tick', () => {
    const g = park(createGame())
    g.cells[10 * COLS + 12] = 1
    g.x[0] = 184
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

  test('an already embedded atom seeds its nearest open neighbour instead of losing its living region', () => {
    const g = park(createGame(), 40, 168)
    divider(g, 10)
    g.x[0] = 171
    g.y[0] = 168
    expect(fillRegions(g)).toBe(ROWS)
    expect(g.cells[10 * COLS + 11]).toBe(0)
    expect(g.cells[0]).toBe(0)
    expect(g.cells[COLS - 1]).toBe(0)
    expect(g.x[0]).toBe(171)
    expect(g.y[0]).toBe(168)
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

  test('level bonuses use the real level number after the atom cap', () => {
    const g = park(createGame(100), WIDTH - 80, HEIGHT - 24)
    for (let i = 0; i < 608; i++) g.cells[(i % ROWS) * COLS + Math.floor(i / ROWS)] = 1
    g.remaining = 19000
    g.lives = 2
    fillRegions(g)
    expect(g.area).toBe(80)
    expect(g.tally.area).toBe(500000)
    expect(g.tally.lives).toBe(100000)
    expect(g.tally.time).toBe(38000)
    expect(g.score).toBe(60800 + 638000)
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
    expect(addScore([], 1, '   ')[0].name).toBe('Anonymous')
    expect(isSettings({ ...defaults, scores: [{ name: 'a', score: 1 }, { name: 'b', score: 2 }] })).toBe(false)
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

describe('client-size fitting, cursor hotspots and touch gestures', () => {
  test('Pocket landscape fits the whole fixed-aspect field with side gutters, including both wide phones', () => {
    for (const [width, height] of [[844, 272], [932, 312]]) {
      const layout = fitField(width, height, true)
      expect(layout.landscape).toBe(true)
      expect(layout.height).toBeLessThanOrEqual(height)
      expect(layout.width).toBeLessThanOrEqual(width - 208)
      expect(layout.width / layout.height).toBeCloseTo(WIDTH / HEIGHT)
      expect((width - layout.width) / 2).toBeGreaterThanOrEqual(104)
    }
  })

  test('portrait and shorter client bodies reserve all 56 status pixels and 60 thumb-control pixels', () => {
    for (const [width, height] of [[390, 726], [390, 250], [300, 220]]) {
      const layout = fitField(width, height, true)
      expect(layout.landscape).toBe(false)
      expect(layout.width).toBeLessThanOrEqual(width)
      expect(layout.height + STATUS_HEIGHT + CONTROL_HEIGHT).toBeLessThanOrEqual(height + 1e-8)
      expect(layout.width / layout.height).toBeCloseTo(WIDTH / HEIGHT)
    }
    expect(fitField(608, 376, false)).toEqual({ width: 608, height: 320, landscape: false })
  })

  test('side gutters require room for at least half the logical field, not just a wide body ratio', () => {
    expect(fitField(511, 250, true).landscape).toBe(false)
    const minimum = fitField(512, 250, true)
    expect(minimum.landscape).toBe(true)
    expect(minimum.width).toBe(WIDTH / 2)
    expect((512 - minimum.width) / 2).toBe(104)
  })

  test('the pointer follows subcell coordinates and builds from its central hotspot', () => {
    const cursor: Cursor = { x: 0, y: 0, px: 0, py: 0, orientation: 'vertical', visible: true }
    pointCursor(cursor, 102.7, 53.2, 304, 160)
    expect(cursor.px).toBeCloseTo(205.4)
    expect(cursor.py).toBeCloseTo(106.4)
    expect(cursor.x).toBe(12)
    expect(cursor.y).toBe(6)
    pointCursor(cursor, 7.9, 10, 304, 160)
    expect(cursor.x).toBe(0)
    pointCursor(cursor, 8.1, 10, 304, 160)
    expect(cursor.x).toBe(1)
    const g = park(createGame())
    expect(startWall(g, cursor.x, cursor.y, cursor.orientation)).toBe(true)
    expect(g.wallX).toBe(1)
    expect(g.wallY).toBe(1)
  })

  test('keyboard movement recentres the arrow in its cell, restores visibility and stays in the field', () => {
    const cursor: Cursor = { x: 1, y: 1, px: 16.2, py: 20, orientation: 'horizontal', visible: false }
    moveCursor(cursor, 1, 0)
    expect(cursor).toEqual({ x: 2, y: 1, px: 40, py: 24, orientation: 'horizontal', visible: true })
    moveCursor(cursor, -100, 100)
    expect(cursor.x).toBe(0)
    expect(cursor.y).toBe(ROWS - 1)
    expect(cursor.px).toBe(8)
    expect(cursor.py).toBe(HEIGHT - 8)
  })

  test('filled, busy and terminal long presses never silently flip the orientation', () => {
    const g = park(createGame())
    const cursor: Cursor = { x: 10, y: 10, px: 168, py: 168, orientation: 'vertical', visible: false }
    g.cells[10 * COLS + 10] = 1
    expect(longPressWall(g, cursor)).toBe(false)
    expect(cursor.orientation).toBe('vertical')
    expect(g.starts).toBe(0)
    g.cells[10 * COLS + 10] = 0
    expect(longPressWall(g, cursor)).toBe(true)
    expect(cursor.orientation).toBe('horizontal')
    expect(g.orientation).toBe('horizontal')
    expect(g.starts).toBe(1)
    expect(longPressWall(g, cursor)).toBe(false)
    expect(cursor.orientation).toBe('horizontal')
    expect(g.starts).toBe(1)
    g.phase = 'over'
    expect(longPressWall(g, cursor)).toBe(false)
    expect(cursor.orientation).toBe('horizontal')
  })

  test('life-loss announcements have singular and zero forms; scores use the same locale formatter', () => {
    expect(s.lostAnnouncement(2)).toBe('A growing wall was destroyed. 2 lives remain.')
    expect(s.lostAnnouncement(1)).toBe('A growing wall was destroyed. 1 life remains.')
    expect(s.lostAnnouncement(0)).toBe('A growing wall was destroyed. No lives remain.')
    expect(s.number(7000)).toBe('7,000')
    expect(s.entry(9360)).toContain('9,360')
    expect(s.fastPending(true)).toContain('next level or new game')
    expect(s.helpText[0]).toContain('maximum of 50')
  })
})

function recordingContext() {
  const calls: { color: string, x: number, y: number, width: number, height: number }[] = []
  const images: unknown[][] = []
  const context = {
    fillStyle: '',
    globalAlpha: 1,
    fillRect(x: number, y: number, width: number, height: number) { calls.push({ color: this.fillStyle, x, y, width, height }) },
    drawImage(...args: unknown[]) { images.push(args) },
  }
  return { calls, images, ctx: context as unknown as CanvasRenderingContext2D }
}

describe('hard-pixel rendering and unobstructed play feedback', () => {
  test('the one-bit cursor uses only whole-pixel rectangles and transposes exactly for vertical input', () => {
    const horizontal = recordingContext()
    const vertical = recordingContext()
    drawPixelCursor(horizontal.ctx, 100.2, 100.4, 'horizontal')
    drawPixelCursor(vertical.ctx, 100.2, 100.4, 'vertical')
    expect(horizontal.calls.length).toBeGreaterThan(0)
    expect(horizontal.calls.every((call) => call.color === '#000' || call.color === '#fff')).toBe(true)
    expect(horizontal.calls.some((call) => call.color === '#000')).toBe(true)
    expect(horizontal.calls.some((call) => call.color === '#fff' && call.x === 100 && call.y === 100)).toBe(true)
    for (let i = 0; i < horizontal.calls.length; i++) {
      const call = horizontal.calls[i]
      for (const value of [call.x, call.y, call.width, call.height]) expect(Number.isInteger(value)).toBe(true)
      expect(vertical.calls[i]).toEqual({ ...call, x: call.y, y: call.x })
    }
  })

  test('revealed walls keep only their exposed bevels and leave adjoining portrait interiors clean', () => {
    const field = recordingContext()
    const reveal = recordingContext()
    const display = recordingContext()
    const g = park(createGame())
    g.cells[10 * COLS + 10] = g.cells[10 * COLS + 11] = 1
    const p: Painter = {
      field: { getContext: () => field.ctx } as unknown as HTMLCanvasElement,
      reveal: { getContext: () => reveal.ctx } as unknown as HTMLCanvasElement,
      revision: -1, dirty: true,
      art: {
        portrait: {} as HTMLImageElement, bg: '#c0c0c0', idx: 46, epithet: '', rects: [{ sx: 0, sy: 0, sw: 16, sh: 16 }],
        heads: { front: {} as CanvasImageSource, side: {} as CanvasImageSource, rect: () => ({ sx: 0, sy: 0, sw: 16, sh: 16 }) },
      },
    }
    // Both atoms have a real-atlas stand-in, so only actual sprite draw calls reach the display recorder.
    p.art.rects[1] = p.art.rects[0]
    const cursor: Cursor = { x: 0, y: 0, px: 8, py: 8, orientation: 'horizontal', visible: false }
    draw(display.ctx, p, g, cursor, true)
    expect(field.calls).toContainEqual({ color: '#b0b0b0', x: 160, y: 160, width: 1, height: 16 })
    expect(field.calls).toContainEqual({ color: '#404040', x: 191, y: 160, width: 1, height: 16 })
    expect(field.calls.some((call) => call.color === '#404040' && call.x === 175 && call.width === 1 && call.height === 16)).toBe(false)
    expect(field.calls.some((call) => call.color === '#b0b0b0' && call.x === 176 && call.width === 1 && call.height === 16)).toBe(false)
    expect(reveal.images[0].slice(1)).toEqual([144, 0, 320, 320])
  })

  test('touch, pause and terminal states suppress the custom cursor; heads retain a light rim and never mirror', () => {
    const g = park(createGame())
    const front = {} as CanvasImageSource
    const side = {} as CanvasImageSource
    const rect = { sx: 0, sy: 0, sw: 16, sh: 16 }
    const p: Painter = {
      field: {} as HTMLCanvasElement, reveal: {} as HTMLCanvasElement, revision: 0, dirty: false,
      art: { portrait: null, bg: '#808080', idx: -1, epithet: '', heads: { front, side, rect: () => rect }, rects: [rect, rect] },
    }
    const cursor: Cursor = { x: 5, y: 5, px: 88, py: 88, orientation: 'horizontal', visible: true }
    const normal = recordingContext()
    draw(normal.ctx, p, g, cursor, true)
    expect(normal.calls.some((call) => call.color === '#000')).toBe(true)
    expect(normal.calls.some((call) => call.color === '#b0bed9')).toBe(true)
    for (const image of normal.images.slice(1)) {
      expect(image[0]).toBe(front)
      expect(image[7]).toBe(16)
      expect(image[8]).toBe(16)
    }
    const paused = recordingContext()
    draw(paused.ctx, p, g, cursor, true, 0, false)
    expect(paused.calls.some((call) => call.color === '#000')).toBe(false)
    cursor.visible = false
    const touched = recordingContext()
    draw(touched.ctx, p, g, cursor, true)
    expect(touched.calls.some((call) => call.color === '#000')).toBe(false)
    cursor.visible = true
    g.elapsed = 120
    g.bounceAt[0] = 120
    g.bounceAxis[0] = 1
    const bounce = recordingContext()
    draw(bounce.ctx, p, g, cursor, true)
    expect(bounce.calls.some((call) => call.color === '#fff' && call.width === 8 && call.height === 1)).toBe(true)
    expect(bounce.images[1][0]).toBe(side)
    expect(bounce.images[1].slice(7)).toEqual([14, 18])
    g.phase = 'over'
    const terminal = recordingContext()
    draw(terminal.ctx, p, g, cursor, true)
    expect(terminal.calls.some((call) => call.color === '#000')).toBe(false)
  })
})
