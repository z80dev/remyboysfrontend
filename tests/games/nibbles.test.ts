import { describe, expect, test } from 'bun:test'
import {
  bodyCell, buildWalls, cell, CELLS, COLS, continueGame, createGame, DEATH, DOWN, EAT, formatScore, GAME_OVER,
  LEFT, LEVEL, layoutLevel, pauseGame, placeNumber, queueTurn, resetRound, RIGHT, startPosition, stepGame, stepInterval, UP,
  type Direction, type Game, type Options,
} from '../../src/games/nibbles/engine'
import { levelMessage, scoreLine, strings } from '../../src/games/nibbles/strings'
import { EAT_NUMBER, END_GAME, LEVEL_START, LOSE_LIFE } from '../../src/games/nibbles/music/phrases'
import { parseMml } from '../../src/games/qbasic/mml'
import { createPainter, displayHeadColor, SETUP_COLS, SETUP_ROWS } from '../../src/games/nibbles/render'
import { beginGesture, clickContinues, moveGesture, touchForInput, type Gesture } from '../../src/games/nibbles/gestures'

const defaults: Options = { players: 1, skill: 50, increaseSpeed: true, monochrome: false }
const row = (r: number, first: number, last: number) => Array.from({ length: last - first + 1 }, (_, i) => cell(r, first + i))
const col = (c: number, first: number, last: number) => Array.from({ length: last - first + 1 }, (_, i) => cell(first + i, c))
const borders = [...row(3, 1, 80), ...row(50, 1, 80), ...col(1, 3, 50), ...col(80, 3, 50)]
const interiors: number[][] = [
  [],
  row(25, 20, 60),
  [...col(20, 10, 40), ...col(60, 10, 40)],
  [...col(20, 4, 30), ...col(60, 23, 49), ...row(38, 2, 40), ...row(15, 41, 79)],
  [...col(21, 13, 39), ...col(59, 13, 39), ...row(11, 23, 57), ...row(41, 23, 57)],
  [10, 20, 30, 40, 50, 60, 70].flatMap((c) => [...col(c, 4, 22), ...col(c, 31, 49)]),
  Array.from({ length: 23 }, (_, i) => cell(4 + i * 2, 40)),
  [...[10, 30, 50, 70].flatMap((c) => col(c, 4, 40)), ...[20, 40, 60].flatMap((c) => col(c, 13, 49))],
  Array.from({ length: 42 }, (_, i) => [cell(6 + i, 6 + i), cell(6 + i, 34 + i)]).flat(),
  [
    ...[10, 30, 50, 70].flatMap((c) => Array.from({ length: 23 }, (_, i) => cell(4 + i * 2, c))),
    ...[20, 40, 60].flatMap((c) => Array.from({ length: 23 }, (_, i) => cell(5 + i * 2, c))),
  ],
  [
    ...row(12, 22, 38), ...row(38, 22, 38), ...col(22, 12, 38), ...col(38, 26, 38), ...row(26, 30, 38),
    ...col(44, 12, 38), ...col(62, 12, 38),
    ...Array.from({ length: 9 }, (_, k) => [cell(12 + k, 45 + k), cell(12 + k, 61 - k)]).flat(),
  ],
  [
    ...col(20, 6, 46), ...row(10, 20, 60), ...row(23, 20, 60), ...row(36, 20, 60), ...col(40, 10, 36), ...col(60, 10, 36),
  ].filter((at) => ![
    ...row(10, 49, 52), ...row(36, 29, 32), cell(23, 30), cell(23, 31), cell(23, 50), cell(23, 51),
    cell(16, 40), cell(17, 40), cell(29, 40), cell(30, 40),
  ].includes(at)),
  [
    ...row(9, 32, 48), ...col(27, 14, 34), ...col(53, 14, 34), ...col(25, 21, 27), ...col(55, 21, 27),
    ...row(17, 36, 46), ...col(35, 18, 30), ...row(31, 36, 46),
    ...Array.from({ length: 5 }, (_, i) => [cell(10 + i, 31 - i), cell(10 + i, 49 + i)]).flat(),
    ...Array.from({ length: 4 }, (_, i) => [cell(35 + i, 28 + i), cell(35 + i, 52 - i)]).flat(),
  ],
]
const starts: [number, number, Direction, number, number, Direction][] = [
  [25, 50, RIGHT, 25, 30, LEFT],
  [7, 60, LEFT, 43, 20, RIGHT],
  [25, 50, UP, 25, 30, DOWN],
  [7, 60, LEFT, 43, 20, RIGHT],
  [25, 50, UP, 25, 30, DOWN],
  [7, 65, DOWN, 43, 15, UP],
  [7, 65, DOWN, 43, 15, UP],
  [7, 65, DOWN, 43, 15, UP],
  [40, 75, UP, 15, 5, DOWN],
  [7, 65, DOWN, 43, 15, UP],
  [7, 65, DOWN, 43, 15, UP],
  [7, 65, DOWN, 43, 15, UP],
  [7, 65, DOWN, 43, 15, UP],
]

function position(game: Game, player: number, positions: [number, number][], direction: Direction) {
  const snake = game.snakes[player]
  snake.head = 0
  snake.size = positions.length
  snake.length = positions.length
  snake.direction = direction
  snake.queued = 0
  positions.forEach(([r, c], index) => { snake.cells[index] = cell(r, c) })
  game.occupied.fill(0)
  game.snakes.forEach((other, owner) => {
    for (let depth = 0; depth < other.size; depth++) game.occupied[bodyCell(other, depth)] = owner + 1
  })
  game.numberCell = cell(45, 75)
}

function running(players: 1 | 2 = 1) {
  const game = createGame(12345, { ...defaults, players })
  continueGame(game)
  return game
}

describe('Nibbles head display contrast', () => {
  test('body-matching skin and blue hair gain contrast without changing other canonical colours', () => {
    for (const body of [14, 13]) {
      expect(displayHeadColor(body, 'skin', body, false)).toBe(15)
      for (const hair of [1, 9]) expect(displayHeadColor(hair, 'hair', body, false)).toBe(11)
      for (let color = 0; color < 16; color++) {
        if (color !== body) expect(displayHeadColor(color, 'skin', body, false)).toBe(color)
        if (color !== 1 && color !== 9) expect(displayHeadColor(color, 'hair', body, false)).toBe(color)
      }
    }
  })

  test('monochrome keeps white hair and gray skin for every underlying colour', () => {
    for (let color = 0; color < 16; color++) {
      expect(displayHeadColor(color, 'hair', 14, true)).toBe(15)
      expect(displayHeadColor(color, 'skin', 13, true)).toBe(7)
    }
  })
})

describe('Nibbles explicit resuming swipe', () => {
  const slots = (): Gesture[] => [
    { id: -1, x: 0, y: 0, player: 0 },
    { id: -1, x: 0, y: 0, player: 0 },
  ]

  for (const phase of ['ready', 'paused'] as const) {
    test(`first swipe from ${phase} continues and turns both independent players`, () => {
      const game = createGame(12345, { ...defaults, players: 2 })
      if (phase === 'paused') {
        continueGame(game)
        pauseGame(game)
      }
      const gestures = slots()
      const before = game.snakes.map((snake) => bodyCell(snake, 0))
      expect(moveGesture(game, gestures, 10, 40, 20)).toBe(false)
      expect(game.phase).toBe(phase)
      expect(beginGesture(game, gestures, 10, 40, 60, 100, () => { continueGame(game) })).toBe(true)
      expect(game.phase).toBe('playing')
      expect(beginGesture(game, gestures, 20, 160, 60, 100, () => { throw new Error('Already playing') })).toBe(true)
      expect(gestures.map((gesture) => gesture.player)).toEqual([1, 0])
      expect(moveGesture(game, gestures, 10, 40, 20)).toBe(true)
      expect(moveGesture(game, gestures, 20, 160, 100)).toBe(true)
      expect(game.snakes.map((snake) => bodyCell(snake, 0))).toEqual(before)
      stepGame(game)
      expect(game.snakes[1].direction).toBe(UP)
      expect(game.snakes[0].direction).toBe(DOWN)
      expect(bodyCell(game.snakes[1], 0)).toBe(before[1] - COLS)
      expect(bodyCell(game.snakes[0], 0)).toBe(before[0] + COLS)
    })
  }

  test('one-player left-half swipes still steer Remy, and subthreshold motion does not turn', () => {
    const game = running()
    const gestures = slots()
    expect(beginGesture(game, gestures, 1, 20, 50, 100, () => {})).toBe(true)
    expect(gestures[0].player).toBe(0)
    expect(moveGesture(game, gestures, 1, 20, 40)).toBe(false)
    expect(game.snakes[0].queued).toBe(0)
    expect(moveGesture(game, gestures, 1, 20, 20)).toBe(true)
    stepGame(game)
    expect(game.snakes[0].direction).toBe(UP)
  })

  test('game over never continues or captures, and unsuccessful continuation never registers', () => {
    const game = createGame(12345, defaults)
    const gestures = slots()
    expect(beginGesture(game, gestures, 1, 20, 50, 100, () => {})).toBe(false)
    expect(gestures.every((gesture) => gesture.id === -1)).toBe(true)
    game.phase = 'over'
    expect(beginGesture(game, gestures, 1, 20, 50, 100, () => { throw new Error('Game over must not continue') })).toBe(false)
    expect(gestures.every((gesture) => gesture.id === -1)).toBe(true)
  })
})

describe('Nibbles exact level geometry', () => {
  interiors.forEach((inner, index) => {
    test(`level ${index + 1} matches every wall coordinate and no others`, () => {
      const expected = new Set([...borders, ...inner])
      const actual = buildWalls(index + 1)
      expect(actual).toHaveLength(CELLS)
      const coordinates = Array.from(actual, (wall, at) => wall ? at : -1).filter((at) => at !== -1)
      expect(coordinates).toEqual([...expected].sort((a, b) => a - b))
    })
    test(`level ${index + 1} starts match and have three clear cells ahead`, () => {
      const game = createGame(90, { ...defaults, players: 2 })
      game.level = index + 1
      resetRound(game)
      for (let player = 0; player < 2; player++) {
        const offset = player * 3
        const [r, c, heading] = starts[index].slice(offset, offset + 3)
        const direction = heading as Direction
        expect(startPosition(index + 1, player)).toEqual({ row: r, col: c, direction })
        const snake = game.snakes[player]
        expect(bodyCell(snake, 0)).toBe(cell(r, c))
        expect(snake.direction).toBe(direction)
        const dr = [-1, 0, 1, 0][direction]
        const dc = [0, 1, 0, -1][direction]
        expect(bodyCell(snake, 1)).toBe(cell(r - dr, c - dc))
        expect(game.walls[bodyCell(snake, 1)]).toBe(0)
        for (let step = 0; step <= 3; step++) expect(game.walls[cell(r + dr * step, c + dc * step)]).toBe(0)
      }
    })
  })

  test('bonus flag and chin openings remain open', () => {
    const flag = buildWalls(12)
    for (const at of [cell(10, 50), cell(36, 30), cell(23, 30), cell(23, 50), cell(16, 40), cell(29, 40)]) expect(flag[at]).toBe(0)
    const head = buildWalls(13)
    for (const at of row(38, 32, 48)) expect(head[at]).toBe(0)
  })

  test('later levels cycle 10–13 without changing the level number', () => {
    for (let level = 14; level <= 25; level++) {
      const expected = 10 + (level - 14) % 4
      expect(layoutLevel(level)).toBe(expected)
      expect(buildWalls(level)).toEqual(buildWalls(expected))
      expect(startPosition(level, 0)).toEqual({ row: 7, col: 65, direction: DOWN })
    }
  })

  test('one player spawns only Remy on every layout', () => {
    const game = createGame(19, defaults)
    for (let level = 1; level <= 13; level++) {
      game.level = level
      resetRound(game)
      expect(game.snakes).toHaveLength(1)
      expect(Array.from(game.occupied).filter(Boolean)).toEqual([1, 1])
      const jake = startPosition(level, 1)
      expect(game.occupied[cell(jake.row, jake.col)]).toBe(0)
    }
  })
})

describe('Nibbles movement, growth and numbers', () => {
  test('same seeds produce the same free number sequence', () => {
    const first = createGame(713, defaults)
    const second = createGame(713, defaults)
    const seen = new Set<number>()
    for (let i = 0; i < 100; i++) {
      expect(first.numberCell).toBe(second.numberCell)
      seen.add(first.numberCell)
      placeNumber(first)
      placeNumber(second)
    }
    expect(seen.size).toBeGreaterThan(80)
    expect(createGame(714, defaults).numberCell).not.toBe(createGame(713, defaults).numberCell)
  })

  test('every number footprint is free in all 13 layouts', () => {
    const game = createGame(421, { ...defaults, players: 2 })
    for (let level = 1; level <= 13; level++) {
      game.level = level
      resetRound(game)
      for (let i = 0; i < 200; i++) {
        placeNumber(game)
        expect(game.numberCell).toBeGreaterThanOrEqual(cell(5, 2))
        const logicalRow = Math.floor(game.numberCell / COLS) + 1
        expect(logicalRow % 2).toBe(1)
        expect(logicalRow).toBeLessThanOrEqual(47)
        expect((logicalRow - 1) * 8 % 16).toBe(0)
        for (const at of [game.numberCell, game.numberCell + COLS]) {
          expect(game.walls[at]).toBe(0)
          expect(game.occupied[at]).toBe(0)
        }
      }
    }
  })

  test('each free aligned text slot has an equal-width random selection interval', () => {
    const game = running(2)
    const slots: number[] = []
    for (let r = 5; r <= 47; r += 2) {
      for (let c = 2; c <= 79; c++) {
        const at = cell(r, c)
        if (!game.walls[at] && !game.walls[at + COLS] && !game.occupied[at] && !game.occupied[at + COLS]) slots.push(at)
      }
    }
    slots.forEach((at, index) => {
      for (const fraction of [0.25, 0.75]) {
        game.random = () => (index + fraction) / slots.length
        placeNumber(game)
        expect(game.numberCell).toBe(at)
      }
    })
    game.walls.fill(1)
    placeNumber(game)
    expect(game.numberCell).toBe(-1)
  })

  for (let n = 1; n <= 8; n++) {
    test(`eating ${n} gives +${n} score and +${4 * n} target length`, () => {
      const game = running()
      position(game, 0, [[10, 10], [10, 9]], RIGHT)
      game.number = n
      game.numberCell = cell(10, 11)
      expect(stepGame(game)).toBe(EAT)
      expect(game.snakes[0].score).toBe(n)
      expect(game.snakes[0].length).toBe(2 + 4 * n)
      expect(game.snakes[0].size).toBe(3)
      expect(game.number).toBe(n + 1)
    })
  }

  test('growth accrues over subsequent moves and then the tail advances', () => {
    const game = running()
    position(game, 0, [[10, 10], [10, 9]], RIGHT)
    game.numberCell = cell(10, 11)
    stepGame(game)
    game.numberCell = cell(45, 75)
    for (let i = 0; i < 3; i++) stepGame(game)
    expect(game.snakes[0].size).toBe(6)
    expect(game.snakes[0].length).toBe(6)
    expect(game.occupied[cell(10, 9)]).toBe(1)
    stepGame(game)
    expect(game.snakes[0].size).toBe(6)
    expect(game.occupied[cell(10, 9)]).toBe(0)
    expect(bodyCell(game.snakes[0], 0)).toBe(cell(10, 15))
  })

  test('the lower half of the visible number can be eaten', () => {
    const game = running()
    position(game, 0, [[11, 10], [11, 9]], RIGHT)
    game.numberCell = cell(10, 11)
    expect(stepGame(game)).toBe(EAT)
    expect(game.snakes[0].score).toBe(1)
  })

  test('different heads reaching both halves of one number consume it only once, with Remy first', () => {
    const game = running(2)
    position(game, 0, [[10, 10], [10, 9]], RIGHT)
    position(game, 1, [[11, 12], [11, 13]], LEFT)
    game.number = 3
    game.numberCell = cell(10, 11)
    expect(stepGame(game)).toBe(EAT)
    expect(game.snakes.map((snake) => [snake.score, snake.length, snake.size])).toEqual([[3, 14, 3], [0, 2, 2]])
    expect(bodyCell(game.snakes[0], 0)).toBe(cell(10, 11))
    expect(bodyCell(game.snakes[1], 0)).toBe(cell(11, 11))
    expect(game.number).toBe(4)
    expect(game.eaten).toBe(3)
    expect(game.eater).toBe(0)
  })

  test('nine advances the level, resets both lengths to two, and awaits Space', () => {
    const game = running(2)
    position(game, 1, [[10, 10], [10, 9]], RIGHT)
    game.snakes[0].score = 21
    game.snakes[1].score = 12
    game.snakes[1].lives = 3
    game.number = 9
    game.numberCell = cell(10, 11)
    expect(stepGame(game)).toBe(EAT | LEVEL)
    expect(game.level).toBe(2)
    expect(game.phase).toBe('ready')
    expect(game.number).toBe(1)
    expect(game.eaten).toBe(9)
    expect(game.eater).toBe(1)
    expect(game.snakes.map((snake) => [snake.score, snake.size, snake.length, snake.lives])).toEqual([[21, 2, 2, 5], [21, 2, 2, 3]])
    expect(bodyCell(game.snakes[0], 0)).toBe(cell(7, 60))
    expect(bodyCell(game.snakes[1], 0)).toBe(cell(43, 20))
    expect(stepGame(game)).toBe(0)
    expect(continueGame(game)).toBe(true)
    expect(game.phase).toBe('playing')
  })

  test('direct reversal is ignored, and two queued turns execute on distinct steps', () => {
    const game = running()
    game.numberCell = cell(45, 75)
    expect(queueTurn(game, 0, LEFT)).toBe(false)
    expect(queueTurn(game, 0, RIGHT)).toBe(false)
    expect(queueTurn(game, 0, UP)).toBe(true)
    expect(queueTurn(game, 0, DOWN)).toBe(false)
    expect(queueTurn(game, 0, LEFT)).toBe(true)
    expect(queueTurn(game, 0, DOWN)).toBe(false)
    expect(game.snakes[0].queued).toBe(2)
    stepGame(game)
    expect(bodyCell(game.snakes[0], 0)).toBe(cell(24, 50))
    expect(game.snakes[0].direction).toBe(UP)
    expect(game.snakes[0].queued).toBe(1)
    stepGame(game)
    expect(bodyCell(game.snakes[0], 0)).toBe(cell(24, 49))
    expect(game.snakes[0].direction).toBe(LEFT)
    expect(game.snakes[0].queued).toBe(0)
  })

  test('pause clears queued input and requires explicit continuation', () => {
    const game = running()
    queueTurn(game, 0, UP)
    expect(pauseGame(game)).toBe(true)
    const at = bodyCell(game.snakes[0], 0)
    expect(game.snakes[0].queued).toBe(0)
    expect(queueTurn(game, 0, DOWN)).toBe(false)
    expect(stepGame(game)).toBe(0)
    expect(bodyCell(game.snakes[0], 0)).toBe(at)
    expect(game.phase).toBe('paused')
    expect(continueGame(game)).toBe(true)
    expect(game.phase).toBe('playing')
  })
})

describe('Nibbles collisions and lives', () => {
  test('wall death subtracts ten, loses one life and restarts the same sequence/level', () => {
    const game = running(2)
    game.level = 4
    resetRound(game)
    continueGame(game)
    position(game, 0, [[4, 5], [5, 5]], UP)
    game.snakes[0].score = 15
    game.snakes[1].score = 9
    game.number = 7
    expect(stepGame(game)).toBe(DEATH)
    expect(game.level).toBe(4)
    expect(game.number).toBe(1)
    expect(game.deaths).toBe(1)
    expect(game.phase).toBe('ready')
    expect(game.snakes.map((snake) => [snake.score, snake.lives, snake.length])).toEqual([[5, 4, 2], [9, 5, 2]])
    expect(bodyCell(game.snakes[0], 0)).toBe(cell(7, 60))
  })

  test('your own tail is fatal even when it would otherwise leave this step', () => {
    const game = running()
    position(game, 0, [[10, 10], [11, 10], [11, 11], [10, 11]], RIGHT)
    expect(stepGame(game)).toBe(DEATH)
    expect(game.snakes[0].score).toBe(-10)
    expect(game.snakes[0].lives).toBe(4)
  })

  test('your own body is fatal', () => {
    const game = running()
    position(game, 0, [[10, 10], [11, 10], [11, 11], [10, 11], [9, 11]], RIGHT)
    expect(stepGame(game)).toBe(DEATH)
  })

  test('an opponent body collision kills only the moving player', () => {
    const game = running(2)
    position(game, 0, [[10, 10], [10, 9]], RIGHT)
    position(game, 1, [[12, 11], [11, 11], [10, 11]], DOWN)
    expect(stepGame(game)).toBe(DEATH)
    expect(game.deaths).toBe(1)
    expect(game.snakes.map((snake) => snake.lives)).toEqual([4, 5])
  })

  test('simultaneous arrival at an empty cell kills both heads', () => {
    const game = running(2)
    position(game, 0, [[10, 10], [10, 9]], RIGHT)
    position(game, 1, [[10, 12], [10, 13]], LEFT)
    expect(stepGame(game)).toBe(DEATH)
    expect(game.deaths).toBe(3)
    expect(game.snakes.map((snake) => [snake.score, snake.lives])).toEqual([[-10, 4], [-10, 4]])
  })

  test('head swaps are simultaneous deaths too', () => {
    const game = running(2)
    position(game, 0, [[10, 10], [10, 9]], RIGHT)
    position(game, 1, [[10, 11], [10, 12]], LEFT)
    expect(stepGame(game)).toBe(DEATH)
    expect(game.deaths).toBe(3)
  })

  test('any player at zero lives ends the whole game without a round reset', () => {
    const game = running(2)
    position(game, 1, [[4, 5], [5, 5]], UP)
    game.snakes[1].lives = 1
    expect(stepGame(game)).toBe(DEATH | GAME_OVER)
    expect(game.phase).toBe('over')
    expect(game.snakes.map((snake) => snake.lives)).toEqual([5, 0])
    expect(game.snakes[1].score).toBe(-10)
    expect(continueGame(game)).toBe(false)
    expect(queueTurn(game, 0, UP)).toBe(false)
    expect(stepGame(game)).toBe(0)
    const replay = createGame(1, game.options)
    expect(replay.phase).toBe('ready')
    expect(replay.snakes.map((snake) => [snake.score, snake.lives])).toEqual([[0, 5], [0, 5]])
  })
})

describe('Nibbles timing, DOS formatting and canonical copy', () => {
  test('skill maps to the specified step interval, including both extremes', () => {
    expect(stepInterval(1)).toBeCloseTo(168.4)
    expect(stepInterval(90)).toBeCloseTo(26)
    expect(stepInterval(100)).toBe(10)
    expect(stepInterval(0)).toBe(stepInterval(1))
    expect(stepInterval(101)).toBe(stepInterval(100))
  })

  test('progressive speed compounds eight percent per completed level with a ten ms floor', () => {
    expect(stepInterval(50, 2, true)).toBeCloseTo(90 * 0.92)
    expect(stepInterval(50, 4, true)).toBeCloseTo(90 * 0.92 ** 3)
    expect(stepInterval(50, 13, false)).toBe(90)
    expect(stepInterval(1, 100, true)).toBe(10)
    expect(stepInterval(100, 2, true)).toBe(10)
  })

  test('approved PC-speaker phrases have the original eight/four/seven/four note shapes', () => {
    const start = parseMml(LEVEL_START)
    const eat = parseMml(EAT_NUMBER)
    const death = parseMml(LOSE_LIFE)
    const over = parseMml(END_GAME)
    expect([start.notes.length, eat.notes.length, death.notes.length, over.notes.length]).toEqual([8, 4, 7, 4])
    expect(start.duration).toBeLessThan(1)
    expect(eat.notes.map((note) => note.midi)).toEqual([72, 76, 79, 84])
    expect(death.notes.map((note) => note.midi)).toEqual([72, 71, 69, 67, 65, 62, 60])
    expect(over.notes.map((note) => note.midi)).toEqual([55, 53, 52, 48])
    expect(over.duration).toBeGreaterThan(death.duration)
  })

  test('scores always show two trailing zeros, commas and the sign', () => {
    expect(formatScore(0)).toBe('0,000,000')
    expect(formatScore(1)).toBe('0,000,100')
    expect(formatScore(45)).toBe('0,004,500')
    expect(formatScore(-10)).toBe('   -1,000')
    expect(formatScore(-1)).toBe('     -100')
    expect(formatScore(-12345)).toBe('-1,234,500')
    expect(formatScore(12345)).toBe('1,234,500')
    expect(formatScore(1234567)).toBe('123,456,700')
  })

  test('setup order and original pause/death/game-over wording remain exact', () => {
    expect(strings.prompts).toEqual([
      'How many players (1 or 2)?', 'Skill level (1 to 100)?',
      'Increase game speed during play (Y or N)?', 'Monochrome or color monitor (M or C)?',
    ])
    expect(strings.introLines.join(' ')).toBe(strings.introDescription)
    expect(strings.remyDies).toBe('Remy Dies! Push Space! --->')
    expect(strings.jakeDies).toBe('<---- Jake Dies! Push Space')
    expect(strings.paused).toBe(' Game Paused ... Push Space ')
    expect(strings.gameOver).toBe('G A M E   O V E R')
    expect(strings.again).toBe('Play Again?   (Y/N)')
  })
})

describe('Nibbles occupied head rendering', () => {
  test('actual painter draws only inside head and neck across vertical half-cells, horizontal turns and monochrome', () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'document')
    Object.defineProperty(globalThis, 'document', { configurable: true, value: {
      createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect() {} }) }),
    } })
    try {
      const painter = createPainter()
      const rects: { x: number; y: number; w: number; h: number; color: string }[] = []
      const context = {
        fillStyle: '', drawImage() {},
        fillRect(x: number, y: number, w: number, h: number) {
          if (y >= 100 && y < 300) rects.push({ x, y, w, h, color: this.fillStyle })
        },
      } as unknown as CanvasRenderingContext2D
      for (const monochrome of [false, true]) for (const direction of [UP, DOWN, LEFT, RIGHT]) for (const r of [25, 26, 27, 28]) {
        const game = running()
        game.options.monochrome = monochrome
        const neck: [number, number] = direction === UP ? [r + 1, 20] : direction === DOWN ? [r - 1, 20]
          : direction === LEFT ? [r, 21] : [r, 19]
        position(game, 0, [[r, 20], neck], direction)
        game.numberCell = -1
        rects.length = 0
        painter.game(context, game, [{ hair: 1, skin: 14 }], false)
        const occupied = new Set([cell(r, 20), cell(...neck)])
        for (const rect of rects) for (let y = rect.y; y < rect.y + rect.h; y++) for (let x = rect.x; x < rect.x + rect.w; x++) {
          expect(occupied.has(Math.floor(y / 8) * COLS + Math.floor(x / 8))).toBe(true)
        }
        expect(rects.filter((rect) => rect.color === '#000000').length).toBe(2)
        const hair = rects.find((rect) => rect.color === (monochrome ? '#ffffff' : '#55ffff')
          && rect.x === 152 && rect.y === (r - 1) * 8)!
        expect(hair).toMatchObject({ w: 8, h: direction === UP || direction === DOWN ? 8 : 2 })
        expect(rects.some((rect) => rect.color === (monochrome ? '#aaaaaa' : '#ffffff') && rect.h === 8)).toBe(true)
      }
      painter.dispose()
    } finally {
      if (previous) Object.defineProperty(globalThis, 'document', previous)
      else Reflect.deleteProperty(globalThis, 'document')
    }
  })

  test('setup columns, rows and attribution remain canonical', () => {
    expect(SETUP_ROWS).toEqual([5, 8, 15, 17])
    expect(SETUP_COLS).toEqual([20, 21, 20, 20])
    expect(strings.aboutLines[1]).toBe('After NIBBLES.BAS (1990) by Microsoft (the QBasic sample program).')
  })
})

describe('Nibbles review input and score seams', () => {
  test('negative score lines retain positive width with right-aligned signs', () => {
    const game = running(2)
    const widths = game.snakes.map((_, player) => scoreLine(game, player).length)
    for (const snake of game.snakes) snake.score = -10
    expect(scoreLine(game, 0)).toBe('REMY-->  Lives: 5        -1,000')
    expect(scoreLine(game, 1)).toBe('   -1,000  Lives: 5  <--JAKE')
    expect(game.snakes.map((_, player) => scoreLine(game, player).length)).toEqual(widths)
  })

  test('last desktop input hides touch controls while the actual Pocket shell retains them', () => {
    expect(touchForInput(false, 'touch', false)).toBe(true)
    for (const input of ['mouse', 'keyboard']) {
      expect(touchForInput(true, input, false)).toBe(false)
      expect(touchForInput(true, input, true)).toBe(true)
    }
  })

  test('click transitions introductory screens only; touch copy leaves keyboard copy exact', () => {
    expect(clickContinues('startup')).toBe(true)
    expect(clickContinues('intro')).toBe(true)
    for (const screen of ['setup', 'game']) expect(clickContinues(screen)).toBe(false)
    expect(levelMessage(2)).toBe('Level 2, Push Space')
    expect(levelMessage(2, true)).toBe('Level 2, Push Space or tap')
    expect(strings.helpSections[2]).toContain('Blank Enter deliberately uses setup defaults: 1, 50, Y, C.')
  })
})
