import { describe, expect, test } from 'bun:test'
import { createLayout, validateLayout, SIZE, Tile } from '../../src/games/remys-revenge/levels'
import {
  createGame, moveMouse, catTick, yarnTick, resolveTrapped, step, killMouse, nextLevel, selectSpeed, catInterval, scoreTables,
  qualifiesScore, parseLevel, spawnWave, DX, DY, Event,
} from '../../src/games/remys-revenge/engine'
import type { Game } from '../../src/games/remys-revenge/engine'
import {
  beginSwipe, createHeldKeys, pressKey, releaseKey, clearHeldKeys, directionForKey, updateSwipe, repeatDirection, type Swipe,
} from '../../src/games/remys-revenge/input'
import { fitBoard, PAD_BUTTON, PAD_SIZE, HEADER_HEIGHT } from '../../src/games/remys-revenge/layout'
import { S } from '../../src/games/remys-revenge/strings'
import { DEFAULT_PALETTE, mouse, paintActors, paintHeader } from '../../src/games/remys-revenge/art'
import { clearJingle } from '../../src/games/remys-revenge/music/clear'
const at = (x: number, y: number) => y * SIZE + x
function arena(speed = 2, seed = 1) {
  const g = createGame(1, speed, seed)
  g.cells.fill(Tile.Empty)
  g.catCount = 0
  g.yarnCount = 0
  g.mouse = at(11, 11)
  return g
}
function surround(g: Game, cell: number, tile = Tile.Fixed) {
  const x = cell % SIZE, y = Math.floor(cell / SIZE)
  for (let d = 0; d < 8; d++) g.cells[at(x + DX[d], y + DY[d])] = tile
}
describe('authored layouts', () => {
  for (let level = 1; level <= 50; level++) test(`layout ${level} has a genuine first-wave push witness`, () => {
    const layout = createLayout(level), result = validateLayout(layout)
    expect(result.reason).toBeUndefined()
    expect(result.solvable).toBe(true)
    expect(result.witness?.length).toBeGreaterThan(1)
    expect([...createLayout(level).cells]).toEqual([...layout.cells])
    const game = createGame(level)
    game.yarnCount = 0
    let pushes = 0
    for (let action = 1; action < result.witness!.length; action++) {
      const target = result.witness![action]
      const dx = target.x - game.mouse % SIZE
      const dy = target.y - Math.floor(game.mouse / SIZE)
      expect(Math.abs(dx)).toBeLessThanOrEqual(1)
      expect(Math.abs(dy)).toBeLessThanOrEqual(1)
      game.events = 0
      if (dx || dy) {
        let direction = -1
        for (let d = 0; d < 8; d++) if (DX[d] === dx && DY[d] === dy) direction = d
        expect(direction).toBeGreaterThanOrEqual(0)
        expect(moveMouse(game, direction)).toBe(true)
      }
      if (game.events & Event.Push) pushes++
      if (action % 3 === 0) catTick(game)
      expect(game.phase).toBe('playing')
    }
    expect(pushes).toBeGreaterThanOrEqual(2)
    expect([...game.cats.subarray(0, game.catCount)].every(cat => cat < 0)).toBe(true)
  })
  test('51 repeats 1 without losing level number', () => {
    expect([...createLayout(51).cells]).toEqual([...createLayout(1).cells])
    expect(createLayout(51).number).toBe(51)
    expect(catInterval(createGame(51))).toBeLessThan(catInterval(createGame(1)))
  })
  test('invalid geometry is not called solvable', () => {
    const l = createLayout(1)
    l.cells = new Uint8Array(1)
    expect(validateLayout(l).solvable).toBe(false)
  })
})
describe('mouse pushing and hazards', () => {
  for (let d = 0; d < 8; d++) test(`moves and pushes full line in direction ${d}`, () => {
    const g = arena(), first = at(11 + DX[d], 11 + DY[d]), second = at(11 + DX[d] * 2, 11 + DY[d] * 2)
    const end = at(11 + DX[d] * 3, 11 + DY[d] * 3)
    g.cells[first] = g.cells[second] = Tile.Block
    expect(moveMouse(g, d)).toBe(true)
    expect(g.mouse).toBe(first)
    expect(g.cells[first]).toBe(Tile.Empty)
    expect(g.cells[second]).toBe(Tile.Block)
    expect(g.cells[end]).toBe(Tile.Block)
    expect(g.events & Event.Push).toBeTruthy()
  })
  for (const tile of [Tile.Fixed, Tile.Rug, Tile.Trap, Tile.Cheese]) test(`push cannot end on tile ${tile}`, () => {
    const g = arena()
    g.cells[at(12, 11)] = Tile.Block
    g.cells[at(13, 11)] = tile
    expect(moveMouse(g, 2)).toBe(false)
    expect(g.mouse).toBe(at(11, 11))
    expect(g.cells[at(12, 11)]).toBe(Tile.Block)
  })
  test('cats and yarn prevent push endpoints', () => {
    const g = arena()
    g.cells[at(12, 11)] = Tile.Block
    g.catCount = 1
    g.cats[0] = at(13, 11)
    expect(moveMouse(g, 2)).toBe(false)
    g.catCount = 0
    g.yarnCount = 1
    g.yarn[0] = at(13, 11)
    expect(moveMouse(g, 2)).toBe(false)
  })
  test('border and fixed block cannot move', () => {
    const g = arena()
    g.mouse = 0
    expect(moveMouse(g, 7)).toBe(false)
    g.cells[1] = Tile.Fixed
    expect(moveMouse(g, 2)).toBe(false)
  })
  test('rug lasts exactly five simulated seconds, freezes movement', () => {
    const g = arena()
    g.layout.waveTimes = [999]
    g.cells[at(12, 11)] = Tile.Rug
    moveMouse(g, 2)
    expect(g.rugged).toBe(5000)
    expect(moveMouse(g, 2)).toBe(false)
    step(g, 4999)
    expect(g.rugged).toBe(1)
    step(g, 1)
    expect(moveMouse(g, 2)).toBe(true)
  })
  test('trap costs a life, 1500ms respawn resets surviving cats', () => {
    const g = arena()
    g.catCount = 1
    g.cats[0] = at(20, 20)
    g.spawns[0] = at(1, 1)
    g.cells[at(12, 11)] = Tile.Trap
    moveMouse(g, 2)
    expect(g.lives).toBe(2)
    expect(g.phase).toBe('dead')
    expect(moveMouse(g, 0)).toBe(false)
    step(g, 1499)
    expect(g.phase).toBe('dead')
    step(g, 1)
    expect(g.phase).toBe('playing')
    expect(g.mouse).toBe(at(g.layout.mouse.x, g.layout.mouse.y))
    expect(g.cats[0]).toBe(at(1, 1))
  })
  test('zero lives is terminal; death cannot double-charge', () => {
    const g = arena()
    g.lives = 1
    killMouse(g)
    killMouse(g)
    step(g, 9999)
    expect(g.lives).toBe(0)
    expect(g.phase).toBe('over')
  })
  test('respawn preserves occupied mouse starts and finds deterministic free cat edges', () => {
    const g = arena()
    g.cells.fill(Tile.Block)
    g.cells[at(11, 10)] = g.cells[at(10, 11)] = Tile.Empty
    g.cells[at(2, 1)] = g.cells[at(1, 2)] = Tile.Empty
    g.catCount = 2
    g.cats[0] = at(20, 20)
    g.cats[1] = at(19, 20)
    g.cells[g.cats[0]] = g.cells[g.cats[1]] = Tile.Empty
    g.spawns[0] = g.spawns[1] = at(1, 1)
    g.cells[at(g.layout.mouse.x, g.layout.mouse.y)] = Tile.Cheese
    const cells = g.cells.slice()
    killMouse(g)
    step(g, 1500)
    expect(g.phase).toBe('playing')
    expect(g.mouse).toBe(at(11, 10))
    expect(g.cats[0]).toBe(at(2, 1))
    expect(g.cats[1]).toBe(at(1, 2))
    expect(g.cells).toEqual(cells)
    for (let i = 0; i < g.catCount; i++) expect(g.cells[g.cats[i]]).toBe(Tile.Empty)
  })
  test('respawn mouse skips cats and yarn without deleting the pushed block', () => {
    const g = arena()
    const start = at(g.layout.mouse.x, g.layout.mouse.y)
    g.cells[start] = Tile.Block
    g.catCount = 1
    g.cats[0] = at(20, 20)
    g.spawns[0] = start - SIZE
    g.yarnCount = 1
    g.yarn[0] = start - 1
    killMouse(g)
    step(g, 1500)
    expect(g.cells[start]).toBe(Tile.Block)
    expect(g.mouse).toBe(start + 1)
    expect(g.mouse).not.toBe(g.cats[0])
    expect(g.mouse).not.toBe(g.yarn[0])
  })
  test('blocked original perimeter spawns choose the nearest free outer-lane cell', () => {
    const g = arena()
    g.catCount = 1
    g.cats[0] = at(10, 10)
    g.spawns[0] = at(0, 0)
    g.cells[at(0, 0)] = Tile.Block
    killMouse(g)
    step(g, 1500)
    expect(g.cats[0]).toBe(at(1, 0))
    expect(g.cells[at(0, 0)]).toBe(Tile.Block)
  })
  test('an exhausted edge lane retains a cat on its legal cell without erasing tiles', () => {
    const g = arena()
    g.cells.fill(Tile.Block)
    g.cells[g.mouse] = Tile.Empty
    g.catCount = 1
    g.cats[0] = at(10, 10)
    g.cells[g.cats[0]] = Tile.Empty
    g.spawns[0] = at(0, 0)
    const cells = g.cells.slice()
    killMouse(g)
    step(g, 1500)
    expect(g.cats[0]).toBe(at(10, 10))
    expect(g.mouse).toBe(at(11, 11))
    expect(g.cells).toEqual(cells)
  })
  test('horizontal facing follows movement and survives vertical movement and death', () => {
    const g = arena()
    moveMouse(g, 6)
    expect(g.facing).toBe(-1)
    moveMouse(g, 0)
    expect(g.facing).toBe(-1)
    moveMouse(g, 2)
    expect(g.facing).toBe(1)
    const position = g.mouse
    killMouse(g)
    expect(g.mouse).toBe(position)
    expect(g.facing).toBe(1)
  })
  test('eating cheese applies every selected speed multiplier', () => {
    for (let speed = 0; speed < 5; speed++) {
      const g = arena(speed)
      g.cells[at(12, 11)] = Tile.Cheese
      moveMouse(g, 2)
      expect(g.score).toBe(100 * (speed + 1))
      expect(g.cells[at(12, 11)]).toBe(Tile.Empty)
    }
  })
})
describe('cats, waves, and completion', () => {
  test('cat chooses minimum squared distance in clockwise tie order', () => {
    const g = arena()
    g.catCount = 1
    g.cats[0] = at(4, 4)
    catTick(g)
    expect(g.cats[0]).toBe(at(5, 5))
  })
  test('cats avoid hazards, but walk on cheese', () => {
    const g = arena()
    g.catCount = 1
    g.cats[0] = at(9, 11)
    surround(g, g.cats[0])
    g.cells[at(10, 11)] = Tile.Cheese
    catTick(g)
    expect(g.cats[0]).toBe(at(10, 11))
    catTick(g)
    expect(g.phase).toBe('dead')
  })
  test('fallback is deterministic and legal when no reducing move exists', () => {
    const a = arena(), b = arena()
    for (const g of [a, b]) {
      g.mouse = at(11, 11)
      g.catCount = 1
      g.cats[0] = at(5, 5)
      surround(g, g.cats[0])
      g.cells[at(4, 4)] = Tile.Empty
      catTick(g)
      expect(g.cats[0]).toBe(at(4, 4))
    }
    expect(a.cats).toEqual(b.cats)
  })
  test('one trapped cat sits until all cats are trapped', () => {
    const g = arena()
    g.catCount = 2
    g.cats[0] = at(4, 4)
    g.cats[1] = at(18, 18)
    surround(g, g.cats[0])
    resolveTrapped(g)
    expect(g.sitting[0]).toBe(1)
    expect(g.cats[0]).toBe(at(4, 4))
    surround(g, g.cats[1])
    resolveTrapped(g)
    expect(g.cats[0]).toBe(-1)
    expect(g.cats[1]).toBe(-1)
    expect(g.cells[at(4, 4)]).toBe(Tile.Cheese)
    expect(g.phase).toBe('playing')
  })
  test('sitting age persists for 400 simulated milliseconds and restarts on a new trap', () => {
    const g = arena()
    g.layout.waveTimes = [999]
    g.catCount = 2
    g.cats[0] = at(4, 4)
    g.cats[1] = at(18, 18)
    surround(g, g.cats[0])
    resolveTrapped(g)
    expect(g.sittingSince[0]).toBe(0)
    step(g, 399)
    expect(g.elapsed - g.sittingSince[0]).toBe(399)
    step(g, 1)
    expect(g.elapsed - g.sittingSince[0]).toBe(400)
    g.cells[at(4, 3)] = Tile.Empty
    resolveTrapped(g)
    expect(g.sitting[0]).toBe(0)
    g.cells[at(4, 3)] = Tile.Fixed
    resolveTrapped(g)
    expect(g.sittingSince[0]).toBe(400)
  })
  test('mouse neighbor is legal, not a trapping wall', () => {
    const g = arena()
    g.catCount = 1
    g.cats[0] = at(10, 11)
    surround(g, g.cats[0])
    g.cells[g.mouse] = Tile.Empty
    resolveTrapped(g)
    expect(g.cats[0]).toBe(at(10, 11))
    catTick(g)
    expect(g.phase).toBe('dead')
  })
  test('no early wave; blue mark spawns at free edge-adjacent cell', () => {
    const g = arena()
    g.layout.waveTimes = [1]
    step(g, 999)
    expect(g.wave).toBe(0)
    expect(g.catCount).toBe(0)
    step(g, 1)
    expect(g.wave).toBe(1)
    expect(g.catCount).toBe(g.layout.cats.length)
    const x = g.spawns[0] % SIZE, y = Math.floor(g.spawns[0] / SIZE)
    expect(x === 1 || x === 21 || y === 1 || y === 21).toBe(true)
  })
  test('wave cats stay outside Chebyshev two of the mouse, including every edge lane', () => {
    for (let seed = 1; seed <= 50; seed++) for (let side = 0; side < 4; side++) {
      const g = arena(2, seed), lane = 1 + seed % 21
      g.mouse = side === 0 ? at(lane, 1) : side === 1 ? at(21, lane) : side === 2 ? at(lane, 21) : at(1, lane)
      spawnWave(g)
      expect(g.catCount).toBe(g.layout.cats.length)
      for (let i = 0; i < g.catCount; i++) {
        const dx = Math.abs(g.cats[i] % SIZE - g.mouse % SIZE)
        const dy = Math.abs(Math.floor(g.cats[i] / SIZE) - Math.floor(g.mouse / SIZE))
        expect(Math.max(dx, dy)).toBeGreaterThan(2)
      }
    }
  })
  test('last-wave trapping applies each speed multiplier once', () => {
    for (let speed = 0; speed < 5; speed++) {
      const g = arena(speed)
      g.elapsed = 1500
      g.wave = g.layout.waveTimes.length
      g.catCount = 1
      g.cats[0] = at(4, 4)
      surround(g, g.cats[0])
      resolveTrapped(g)
      expect(g.phase).toBe('clear')
      expect(g.score).toBe((118 * 10 + 1000) * (speed + 1))
      expect(g.levelBonus).toBe((118 * 10 + 1000) * (speed + 1))
      resolveTrapped(g)
      expect(g.score).toBe((118 * 10 + 1000) * (speed + 1))
      const n = nextLevel(g)
      expect(n.level).toBe(2)
      expect(n.score).toBe(g.score)
      expect(n.lives).toBe(g.lives)
      expect(n.speed).toBe(speed)
      expect(n.levelBonus).toBe(0)
    }
  })
  test('speed ticks follow prescribed timing', () => {
    expect([0, 1, 2, 3, 4].map(s => catInterval(createGame(1, s)))).toEqual([1200, 900, 650, 450, 300])
  })
  test('pending speed cannot inflate either cheese or the current level bonus', () => {
    const g = arena(0)
    selectSpeed(g, 4)
    expect(g.speed).toBe(0)
    expect(g.pendingSpeed).toBe(4)
    expect(catInterval(g)).toBe(1200)
    g.cells[at(12, 11)] = Tile.Cheese
    moveMouse(g, 2)
    expect(g.score).toBe(100)
    g.elapsed = 1500
    g.wave = g.layout.waveTimes.length
    g.catCount = 1
    g.cats[0] = at(4, 4)
    surround(g, g.cats[0])
    resolveTrapped(g)
    expect(g.levelBonus).toBe(2180)
    expect(g.score).toBe(2280)
    selectSpeed(g, 3)
    expect(g.levelBonus).toBe(2180)
    const next = nextLevel(g)
    expect(next.speed).toBe(3)
    expect(next.pendingSpeed).toBe(3)
    expect(next.score).toBe(2280)
    next.cells.fill(Tile.Empty)
    next.catCount = next.yarnCount = 0
    next.mouse = at(11, 11)
    next.cells[at(12, 11)] = Tile.Cheese
    moveMouse(next, 2)
    expect(next.score).toBe(2680)
    expect(createGame(1, g.pendingSpeed).speed).toBe(3)
  })
  test('each speed moves a cat only at its complete tick boundary', () => {
    for (let speed = 0; speed < 5; speed++) {
      const g = arena(speed)
      g.catCount = 1
      g.cats[0] = at(4, 4)
      g.layout.waveTimes = [999]
      step(g, catInterval(g) - 1)
      expect(g.cats[0]).toBe(at(4, 4))
      step(g, 1)
      expect(g.cats[0]).toBe(at(5, 5))
    }
  })
})
describe('Hopium and scores', () => {
  test('yarn moves diagonally, bounces at boundary, and kills', () => {
    const g = arena()
    g.yarnCount = 1
    g.yarn[0] = at(22, 5)
    g.yarnDX[0] = 1
    g.yarnDY[0] = 1
    yarnTick(g)
    expect(g.yarn[0]).toBe(at(21, 6))
    expect(g.yarnDX[0]).toBe(-1)
    g.mouse = at(20, 7)
    yarnTick(g)
    expect(g.phase).toBe('dead')
  })
  test('fully enclosed yarn becomes cheese', () => {
    const g = arena()
    g.yarnCount = 1
    g.yarn[0] = at(5, 5)
    surround(g, g.yarn[0], Tile.Block)
    yarnTick(g)
    expect(g.yarn[0]).toBe(-1)
    expect(g.cells[at(5, 5)]).toBe(Tile.Cheese)
  })
  test('yarn takes the sole free diagonal without entering a blocking cell', () => {
    for (const exit of [1, 3, 5, 7]) for (const incoming of [1, 3, 5, 7]) {
      const g = arena()
      g.yarnCount = 1
      g.yarn[0] = at(5, 5)
      g.yarnDX[0] = DX[incoming]
      g.yarnDY[0] = DY[incoming]
      surround(g, g.yarn[0], Tile.Block)
      g.cells[at(5 + DX[exit], 5 + DY[exit])] = Tile.Empty
      yarnTick(g)
      expect(g.yarn[0]).toBe(at(5 + DX[exit], 5 + DY[exit]))
      expect(g.cells[g.yarn[0]]).toBe(Tile.Empty)
    }
  })
  test('score tables are top ten with inclusive 24-hour cutoff and no future records', () => {
    const now = 100000000
    const records = Array.from({ length: 20 }, (_, i) => ({ name: String(i), score: i, at: now - i * 1000 }))
    records.push({ name: 'old', score: 100, at: now - 86400001 }, { name: 'boundary', score: 99, at: now - 86400000 },
      { name: 'future', score: 101, at: now + 1 })
    const result = scoreTables(records, now)
    expect(result.overall.length).toBe(10)
    expect(result.recent.length).toBe(10)
    expect(result.recent[0].name).toBe('boundary')
    expect(result.recent.some(s => s.name === 'old' || s.name === 'future')).toBe(false)
    expect(records[0].name).toBe('0')
  })
  test('deep links accept precisely authored starting levels', () => {
    for (const value of ['0', '51', '-1', '2.5', '01', 'hello', '', undefined]) expect(parseLevel(value)).toBe(1)
    expect(parseLevel('50')).toBe(50)
    expect(parseLevel('7')).toBe(7)
  })
  test('changed deep links can ignore invalid input without falling back to a different level', () => {
    expect(parseLevel('21', 0)).toBe(21)
    for (const value of ['0', '51', '01', 'nope', '', undefined]) expect(parseLevel(value, 0)).toBe(0)
    expect(parseLevel(undefined, 35)).toBe(35)
  })
  test('zero never qualifies for a name, even in empty score tables', () => {
    expect(qualifiesScore([], 0, 1000)).toBe(false)
    expect(qualifiesScore([], 1, 1000)).toBe(true)
    const scores = Array.from({ length: 10 }, (_, i) => ({ name: String(i), score: 100 + i, at: 1000 }))
    expect(qualifiesScore(scores, 100, 1000)).toBe(false)
    expect(qualifiesScore(scores, 101, 1000)).toBe(true)
  })
  test('clear copy includes the recorded, locale-formatted bonus and active multiplier', () => {
    expect(S.levelBonus(4110, S.speeds[2], 3)).toBe(`Level bonus: ${(4110).toLocaleString()} (Medium ×3)`)
    expect(S.clearMessage(4110, S.speeds[2], 3)).toContain(S.clearFlavour)
    expect(S.clearMessage(4110, S.speeds[2], 3)).toContain(S.levelBonus(4110, S.speeds[2], 3))
  })
})
describe('precise eight-way touch', () => {
  for (let direction = 0; direction < 8; direction++) test(`swipe ${direction} emits once, then holds after 375ms and repeats at 150ms`, () => {
    const swipe: Swipe = { id: -1, x: 0, y: 0, lastX: 0, lastY: 0, direction: -1, elapsed: 0, moved: false, repeating: false }
    beginSwipe(swipe, 7, 100, 100)
    expect(updateSwipe(swipe, 8, 100 + DX[direction] * 30, 100 + DY[direction] * 30)).toBe(-1)
    expect(updateSwipe(swipe, 7, 101, 101)).toBe(-1)
    expect(updateSwipe(swipe, 7, 100 + DX[direction] * 30, 100 + DY[direction] * 30)).toBe(direction)
    expect(updateSwipe(swipe, 7, 100 + DX[direction] * 60, 100 + DY[direction] * 60)).toBe(-1)
    expect(repeatDirection(swipe, -1, 374)).toBe(-1)
    expect(repeatDirection(swipe, -1, 1)).toBe(direction)
    expect(repeatDirection(swipe, -1, 149)).toBe(-1)
    expect(repeatDirection(swipe, -1, 1)).toBe(direction)
    swipe.id = -1
    swipe.direction = -1
    expect(repeatDirection(swipe, -1, 150)).toBe(-1)
  })
  test('a continuous 300ms, 60px swipe emits exactly one move', () => {
    const swipe: Swipe = { id: -1, x: 0, y: 0, lastX: 0, lastY: 0, direction: -1, elapsed: 0, moved: false, repeating: false }
    beginSwipe(swipe, 7, 100, 100)
    let moves = 0
    for (let frame = 1; frame <= 30; frame++) {
      if (updateSwipe(swipe, 7, 100 + frame * 2, 100) >= 0) moves++
      if (repeatDirection(swipe, -1, 10) >= 0) moves++
    }
    swipe.id = swipe.direction = -1
    expect(repeatDirection(swipe, -1, 150)).toBe(-1)
    expect(moves).toBe(1)
  })
  test('moving again resets the hold delay; tiny stationary jitter does not', () => {
    const swipe: Swipe = { id: -1, x: 0, y: 0, lastX: 0, lastY: 0, direction: -1, elapsed: 0, moved: false, repeating: false }
    beginSwipe(swipe, 7, 100, 100)
    updateSwipe(swipe, 7, 130, 100)
    expect(repeatDirection(swipe, -1, 300)).toBe(-1)
    updateSwipe(swipe, 7, 135, 100)
    expect(repeatDirection(swipe, -1, 300)).toBe(-1)
    updateSwipe(swipe, 7, 136, 101)
    expect(repeatDirection(swipe, -1, 75)).toBe(2)
  })
  test('holding Right and tapping Q restores Right; unrelated Shift release does not stop movement', () => {
    const held = createHeldKeys()
    expect(pressKey(held, 'ArrowRight')).toBe(2)
    expect(pressKey(held, 'Q')).toBe(7)
    expect(held.direction).toBe(7)
    expect(releaseKey(held, 'q')).toBe(2)
    expect(releaseKey(held, 'Shift')).toBe(2)
    expect(held.direction).toBe(2)
    const swipe: Swipe = { id: -1, x: 0, y: 0, lastX: 0, lastY: 0, direction: -1, elapsed: 0, moved: false, repeating: false }
    expect(repeatDirection(swipe, held.direction, 375)).toBe(2)
    expect(releaseKey(held, 'ArrowRight')).toBe(-1)
    expect(repeatDirection(swipe, held.direction, 150)).toBe(-1)
  })
  test('release falls back to the last remaining physical key, including separate same-direction aliases', () => {
    const held = createHeldKeys()
    pressKey(held, 'ArrowRight')
    pressKey(held, '6')
    pressKey(held, 'Home')
    pressKey(held, 'ArrowUp')
    expect(releaseKey(held, 'Home')).toBe(0)
    expect(releaseKey(held, 'ArrowUp')).toBe(2)
    expect(releaseKey(held, '6')).toBe(2)
    expect(releaseKey(held, 'ArrowRight')).toBe(-1)
    expect(directionForKey('Q')).toBe(7)
  })
  test('input reset clears every physically held movement key', () => {
    const held = createHeldKeys()
    pressKey(held, 'ArrowRight')
    pressKey(held, 'Q')
    clearHeldKeys(held)
    expect(held.direction).toBe(-1)
    expect(held.pressed.size).toBe(0)
    expect(releaseKey(held, 'Q')).toBe(-1)
    expect(pressKey(held, 'Shift')).toBeUndefined()
    expect(held.direction).toBe(-1)
  })
})
describe('measured client fitting', () => {
  for (const [width, height] of [[844, 296], [932, 336]]) test(`landscape ${width}px fits the entire board beside the thumb-edge pad`, () => {
    const layout = fitBoard(width, height, 22, true)
    expect(layout.landscape).toBe(true)
    expect(layout.board).toBeGreaterThan(0)
    expect(layout.board + layout.padding * 2 + PAD_SIZE + 16).toBeLessThanOrEqual(width)
    expect(layout.board + layout.padding * 2 + HEADER_HEIGHT + 22).toBeLessThanOrEqual(height)
    expect(PAD_BUTTON).toBe(56)
  })
  test('portrait reserves its bottom pad, header, menu and pending speed hint', () => {
    const layout = fitBoard(390, 750, 22, true, 20)
    expect(layout.landscape).toBe(false)
    expect(layout.board + layout.padding * 2).toBeLessThanOrEqual(390)
    expect(layout.board + layout.padding * 2 + PAD_SIZE + 16 + HEADER_HEIGHT + 22 + 20).toBeLessThanOrEqual(750)
  })
  test('small desktop clients also fit by height without a width media query', () => {
    const layout = fitBoard(400, 350, 22, false)
    expect(layout.landscape).toBe(false)
    expect(layout.board + layout.padding * 2 + HEADER_HEIGHT + 22).toBeLessThanOrEqual(350)
    expect(fitBoard(400, 472, 22, false).board).toBe(368)
  })
})
test('run seeds affect random sidesteps while preserving deterministic replay and the witness seed', () => {
  const outcomes = new Set<number>()
  for (let seed = 1; seed <= 16; seed++) {
    const a = arena(2, seed), b = arena(2, seed)
    for (const g of [a, b]) {
      g.catCount = 1
      g.cats[0] = at(5, 5)
      surround(g, g.cats[0])
      g.cells[at(4, 4)] = g.cells[at(4, 5)] = Tile.Empty
      catTick(g)
    }
    expect(a.cats).toEqual(b.cats)
    outcomes.add(a.cats[0])
  }
  expect(outcomes.size).toBeGreaterThan(1)
  expect(createGame().seed).toBe(1)
})
function recordingContext() {
  const calls: { color: string, x: number, y: number, width: number, height: number }[] = []
  let tx = 0, ty = 0, sx = 1, sy = 1
  const stack: number[][] = []
  const context = {
    fillStyle: '', strokeStyle: '', lineWidth: 1,
    fillRect(x: number, y: number, width: number, height: number) {
      calls.push({
        color: this.fillStyle, x: tx + sx * (x + (sx < 0 ? width : 0)), y: ty + sy * y,
        width: Math.abs(sx) * width, height: Math.abs(sy) * height,
      })
    },
    save() { stack.push([tx, ty, sx, sy]) },
    restore() { [tx, ty, sx, sy] = stack.pop()! },
    translate(x: number, y: number) { tx += x * sx; ty += y * sy },
    scale(x: number, y: number) { sx *= x; sy *= y },
    beginPath() {}, arc() {}, fill() {}, moveTo() {}, closePath() {}, stroke() {}, lineTo() {},
  }
  return { calls, ctx: context as unknown as CanvasRenderingContext2D }
}
describe('procedural art and unobstructed event feedback', () => {
  test('only the procedural mouse mirrors, retaining rounded ears, a spike and a visible X-eyed death frame', () => {
    const right = recordingContext(), left = recordingContext(), dead = recordingContext()
    mouse(right.ctx, 0, 0, DEFAULT_PALETTE, false, 1)
    mouse(left.ctx, 0, 0, DEFAULT_PALETTE, false, -1)
    expect(left.calls).toEqual(right.calls.map(call => ({ ...call, x: 16 - call.x - call.width })))
    expect(right.calls).toContainEqual({ color: DEFAULT_PALETTE.hair, x: 5, y: 1, width: 1, height: 1 })
    expect(right.calls).toContainEqual({ color: DEFAULT_PALETTE.hair, x: 7, y: 1, width: 1, height: 3 })
    mouse(dead.ctx, 0, 0, DEFAULT_PALETTE, false, 1, true)
    for (const [x, y] of [[10, 8], [12, 8], [11, 9], [10, 10], [12, 10]]) {
      expect(dead.calls).toContainEqual({ color: '#000', x, y, width: 1, height: 1 })
    }
    const g = arena()
    killMouse(g)
    const actors = recordingContext()
    paintActors(actors.ctx, g, DEFAULT_PALETTE, false)
    expect(actors.calls).toContainEqual({ color: '#000', x: 187, y: 185, width: 1, height: 1 })
  })
  test('a sitting cat has low haunches and keeps its sweat for 400ms, even across repeated paints', () => {
    const g = arena()
    g.catCount = 2
    g.cats[0] = at(4, 4)
    g.cats[1] = at(18, 18)
    surround(g, g.cats[0])
    resolveTrapped(g)
    for (const elapsed of [0, 0, 399, 400]) {
      g.elapsed = elapsed
      const painter = recordingContext()
      paintActors(painter.ctx, g, DEFAULT_PALETTE, false)
      expect(painter.calls).toContainEqual({ color: '#5a2838', x: 67, y: 75, width: 10, height: 3 })
      expect(painter.calls.filter(call => call.color === '#60a0ff').length).toBe(elapsed < 400 ? 2 : 0)
    }
  })
  test('rug pips shrink on the mouse cell without any board-wide banner', () => {
    const g = arena()
    for (const [remaining, pips] of [[5000, 5], [3001, 4], [1, 1], [0, 0]]) {
      g.rugged = remaining
      const painter = recordingContext()
      paintActors(painter.ctx, g, DEFAULT_PALETTE, false)
      expect(painter.calls.filter(call => call.color === '#fff').length).toBe(pips)
      expect(painter.calls.every(call => call.width <= 16 && call.height <= 16)).toBe(true)
    }
  })
  test('header flashes replace only the clock, keeping the lives and score visible', () => {
    const g = arena()
    const painter = recordingContext()
    paintHeader(painter.ctx, g, DEFAULT_PALETTE, false, true)
    expect(painter.calls).toContainEqual({ color: '#606060', x: 15, y: 21, width: 10, height: 7 })
    expect(painter.calls.some(call => call.color === '#202820' && call.x >= 270)).toBe(true)
    expect(painter.calls.filter(call => call.width < 400).every(call => call.x < 76 || call.x >= 256)).toBe(true)
    const clock = recordingContext()
    paintHeader(clock.ctx, g, DEFAULT_PALETTE, false, false)
    expect(clock.calls.some(call => call.x >= 180 && call.x <= 220)).toBe(true)
  })
  test('Hopium has three curved wraps and a loose tail, all drawn as whole-pixel rectangles', () => {
    const g = arena()
    g.yarnCount = 1
    g.yarn[0] = at(5, 5)
    const painter = recordingContext()
    paintActors(painter.ctx, g, DEFAULT_PALETTE, false)
    for (const [x, y, width] of [[86, 85, 4], [85, 88, 5], [86, 91, 4], [93, 93, 2]]) {
      expect(painter.calls).toContainEqual({ color: '#c878a0', x, y, width, height: 1 })
    }
    expect(painter.calls.every(call => [call.x, call.y, call.width, call.height].every(Number.isInteger))).toBe(true)
  })
})
test('yarn boxed on all diagonal exits becomes cheese even with cardinal gaps', () => {
  const g = arena()
  g.yarnCount = 1
  g.yarn[0] = at(5, 5)
  g.yarnDX[0] = 1
  g.yarnDY[0] = 1
  for (let d = 1; d < 8; d += 2) g.cells[at(5 + DX[d], 5 + DY[d])] = Tile.Block
  yarnTick(g)
  expect(g.yarn[0]).toBe(-1)
  expect(g.cells[at(5, 5)]).toBe(Tile.Cheese)
})
test('diagonal yarn collision chooses a legal reflected exit', () => {
  const g = arena()
  g.yarnCount = 1
  g.yarn[0] = at(5, 5)
  g.yarnDX[0] = 1
  g.yarnDY[0] = 1
  g.cells[at(6, 6)] = Tile.Block
  yarnTick(g)
  expect(g.yarn[0]).toBe(at(4, 6))
})

test('the original clear jingle is non-looping and no longer than three seconds', () => {
  expect(clearJingle.loopStart).toBe(clearJingle.length)
  expect(clearJingle.length * 60 / clearJingle.bpm / clearJingle.stepsPerBeat).toBeLessThanOrEqual(3)
  expect(clearJingle.parts.every(part => part.notes.length > 0 && part.notes.every(note => note[0] + note[2] <= clearJingle.length))).toBe(true)
})
