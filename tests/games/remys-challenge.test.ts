import { describe, expect, test } from 'bun:test'
import { createState, step as tick, replay, passwordLevel, levelScore } from '../../src/games/remys-challenge/engine'
import { Tile, index, TICK_MS, type State, type ActorSpec, type Direction, type Level, type MonsterKind } from '../../src/games/remys-challenge/types'
import { buildLevel, LEGEND } from '../../src/games/remys-challenge/levels/build'
import { LEVELS } from '../../src/games/remys-challenge/levels'
import { LEVEL_SONGS, songForLevel, winJingle, deathJingle } from '../../src/games/remys-challenge/music/jingles'

// Fixtures describe one ordinary 200ms turn; slide checks call the 100ms tick directly.
function step(state: State, direction?: Direction) {
  tick(state, direction)
  return tick(state, direction)
}

function fixture(tiles: [number, number, Tile][] = [], actors: ActorSpec[] = [], extra: Partial<Level> = {}): Level {
  const bottom = Array<Tile>(1024).fill(Tile.Wall)
  for (let y = 1; y < 10; y++) for (let x = 1; x < 10; x++) bottom[index(x, y)] = Tile.Floor
  for (const [x, y, tile] of tiles) bottom[index(x, y)] = tile
  return { number: 1, title: 'Fixture', hint: '', password: 'TEST', time: 100, chips: 0, bottom,
    top: [{ kind: 'player', x: 2, y: 2, dir: 1 }, ...actors], traps: [], cloners: [], solution: '', ...extra }
}

function monster(kind: MonsterKind, tiles: [number, number, Tile][] = [], dir: Direction = 0) {
  const s = createState(fixture(tiles, [{ kind, x: 6, y: 6, dir }]))
  const a = s.actors.find(a => a.kind === kind)!
  return { s, a }
}

describe('Microsoft tile rules', () => {
  test('100ms physics queues taps; ordinary steps take 200ms and sliding steps take 100ms', () => {
    expect(TICK_MS).toBe(100)
    const s = createState(fixture([], [{ kind: 'tank', x: 6, y: 6, dir: 0 }]))
    tick(s, 1)
    expect(s.player.pos).toBe(index(2, 2))
    expect(s.actors[1].pos).toBe(index(6, 6))
    expect(s.queuedInput).toBe(1)
    tick(s)
    expect(s.player.pos).toBe(index(3, 2))
    expect(s.actors[1].pos).toBe(index(6, 5))
    expect(s.queuedInput).toBeUndefined()
    s.tiles[s.player.pos] = Tile.Ice
    s.tiles[s.actors[1].pos] = Tile.Ice
    tick(s)
    expect(s.player.pos).toBe(index(4, 2))
    expect(s.actors[1].pos).toBe(index(6, 4))
  })
  test('keys and doors consume all but the reusable green key', () => {
    for (let color = 0; color < 4; color++) {
      const s = createState(fixture([[3, 2, Tile.BlueDoor + color]]))
      step(s, 1)
      expect(s.player.pos).toBe(index(2, 2))
      s.tiles[index(3, 2)] = Tile.BlueKey + color
      step(s, 1)
      expect(s.keys[color]).toBe(1)
      s.tiles[index(4, 2)] = Tile.BlueDoor + color
      step(s, 1)
      expect(s.player.pos).toBe(index(4, 2))
      expect(s.keys[color]).toBe(color === 2 ? 1 : 0)
    }
  })
  test('collect chips, open socket, reach exit', () => {
    const s = createState(fixture([[3, 2, Tile.Chip], [4, 2, Tile.Socket], [5, 2, Tile.Exit]], [], { chips: 1 }))
    step(s, 1)
    expect(s.chipsLeft).toBe(0)
    step(s, 1)
    expect(s.events).toContain('socket')
    step(s, 1)
    expect(s.status).toBe('won')
  })
  test('socket remains shut while any chips remain', () => {
    const s = createState(fixture([[3, 2, Tile.Socket]], [], { chips: 1 }))
    step(s, 1)
    expect(s.player.pos).toBe(index(2, 2))
  })
  test('all fatal causes and equipment protections', () => {
    for (const [tile, death, boot] of [[Tile.Fire, 'fire', 1], [Tile.Water, 'water', 0], [Tile.Bomb, 'bomb', -1]] as const) {
      const s = createState(fixture([[3, 2, tile]]))
      step(s, 1)
      expect(s.death).toBe(death)
      if (boot >= 0) {
        const safe = createState(fixture([[3, 2, tile]]))
        safe.boots[boot] = true
        step(safe, 1)
        expect(safe.status).toBe('playing')
      }
    }
    const timed = createState(fixture([], [], { time: 1 }))
    for (let n = 0; n < 5; n++) step(timed)
    expect(timed.death).toBe('time')
    const untimed = createState(fixture([], [], { time: 0 }))
    for (let n = 0; n < 100; n++) step(untimed)
    expect(untimed.status).toBe('playing')
  })
  test('all boots are collected, thief takes only boots', () => {
    const s = createState(fixture([[3, 2, Tile.Flippers], [4, 2, Tile.FireBoots], [5, 2, Tile.Skates], [6, 2, Tile.SuctionBoots], [7, 2, Tile.Thief]]))
    for (let n = 0; n < 4; n++) step(s, 1)
    expect(s.boots).toEqual([true, true, true, true])
    s.keys[0] = 1
    step(s, 1)
    expect(s.boots).toEqual([false, false, false, false])
    expect(s.keys[0]).toBe(1)
    expect(s.thief).toBe(true)
  })
  test('block fills water with dirt and player clears dirt', () => {
    const s = createState(fixture([[4, 2, Tile.Water]], [{ kind: 'block', x: 3, y: 2 }]))
    step(s, 1)
    expect(s.tiles[index(4, 2)]).toBe(Tile.Dirt)
    step(s, 1)
    expect(s.tiles[index(4, 2)]).toBe(Tile.Floor)
    expect(s.status).toBe('playing')
  })
  test('blocks cannot be chain-pushed, enter dirt, or leave a closed trap', () => {
    const stacked = createState(fixture([], [{ kind: 'block', x: 3, y: 2 }, { kind: 'block', x: 4, y: 2 }]))
    step(stacked, 1)
    expect(stacked.player.pos).toBe(index(2, 2))
    for (const tile of [Tile.Dirt, Tile.Gravel]) {
      const s = createState(fixture([[4, 2, tile]], [{ kind: 'block', x: 3, y: 2 }]))
      step(s, 1)
      expect(s.player.pos).toBe(index(2, 2))
    }
    const trapped = createState(fixture([[3, 2, Tile.Trap]], [{ kind: 'block', x: 3, y: 2 }]))
    step(trapped, 1)
    expect(trapped.player.pos).toBe(index(2, 2))
  })
  test('bomb destroys block and itself, and destroys monsters', () => {
    const s = createState(fixture([[4, 2, Tile.Bomb]], [{ kind: 'block', x: 3, y: 2 }]))
    step(s, 1)
    expect(s.actors[1].alive).toBe(false)
    expect(s.tiles[index(4, 2)]).toBe(Tile.Floor)
    const { s: m, a } = monster('tank', [[6, 5, Tile.Bomb]])
    step(m)
    expect(a.alive).toBe(false)
    expect(m.tiles[index(6, 5)]).toBe(Tile.Floor)
  })
  test('ice slides, bounces on obstacles, rejects input without skates', () => {
    const s = createState(fixture([[3, 2, Tile.Ice], [4, 2, Tile.Ice], [5, 2, Tile.Wall]]))
    step(s, 1)
    tick(s, 2)
    expect(s.player.pos).toBe(index(4, 2))
    tick(s)
    expect(s.player.pos).toBe(index(3, 2))
    s.boots[2] = true
    step(s, 2)
    expect(s.player.pos).toBe(index(3, 3))
  })
  test('corner ice redirects, and its solid edges block entry', () => {
    const s = createState(fixture([[3, 2, Tile.IceNE]]))
    step(s, 1)
    tick(s)
    expect(s.player.pos).toBe(index(3, 3))
    const blocked = createState(fixture([[3, 2, Tile.IceNW]]))
    step(blocked, 1)
    expect(blocked.player.pos).toBe(index(2, 2))
  })
  test('every ice-corner orientation redirects its two legal entries', () => {
    for (const [tile, entry, expected] of [
      [Tile.IceNW, 0, index(7, 6)], [Tile.IceNE, 0, index(5, 6)],
      [Tile.IceSW, 2, index(7, 6)], [Tile.IceSE, 2, index(5, 6)],
      [Tile.IceNW, 3, index(6, 7)], [Tile.IceNE, 1, index(6, 7)],
      [Tile.IceSW, 3, index(6, 5)], [Tile.IceSE, 1, index(6, 5)]
    ] as const) {
      const s = createState(fixture([[6, 6, tile]]))
      s.player.pos = index(6, 6) - [-32, 1, 32, -1][entry]
      step(s, entry); tick(s)
      expect(s.player.pos).toBe(expected)
    }
  })
  test('MS force override follows an involuntary move, permits backward, and suction boots bypass it', () => {
    for (const [override, boots, expected] of [[undefined, false, index(5, 2)], [2, false, index(4, 3)], [3, false, index(3, 2)], [3, true, index(3, 2)]] as const) {
      const s = createState(fixture([[3, 2, Tile.ForceE], [4, 2, Tile.ForceE]]))
      step(s, 1)
      tick(s, 2)
      expect(s.player.pos).toBe(index(4, 2))
      s.boots[3] = boots
      tick(s, override)
      expect(s.player.pos).toBe(expected)
    }
  })
  test('teleports use reverse reading order and skip blocked exits', () => {
    const s = createState(fixture([[3, 2, Tile.Teleport], [8, 8, Tile.Teleport], [5, 5, Tile.Teleport]]))
    step(s, 1)
    expect(s.player.pos).toBe(index(9, 8))
    const skip = createState(fixture([[3, 2, Tile.Teleport], [8, 8, Tile.Teleport], [9, 8, Tile.Wall], [5, 5, Tile.Teleport]]))
    step(skip, 1)
    expect(skip.player.pos).toBe(index(6, 5))
  })
  test('thin walls block only the specified edge in both directions', () => {
    const s = createState(fixture([[3, 2, Tile.ThinW]]))
    step(s, 1)
    expect(s.player.pos).toBe(index(2, 2))
    step(s, 2); step(s, 1); step(s, 0)
    expect(s.player.pos).toBe(index(3, 2))
    step(s, 3)
    expect(s.player.pos).toBe(index(3, 2))
  })
  test('popup and recessed walls rise after leaving; fake blue clears; hidden reveals; invisible stays invisible', () => {
    for (const tile of [Tile.Popup, Tile.RecessedWall]) {
      const s = createState(fixture([[3, 2, tile]]))
      step(s, 1); step(s, 1)
      expect(s.tiles[index(3, 2)]).toBe(Tile.Wall)
    }
    const fake = createState(fixture([[3, 2, Tile.FakeBlueWall]]))
    step(fake, 1)
    expect(fake.tiles[index(3, 2)]).toBe(Tile.Floor)
    for (const tile of [Tile.HiddenWall, Tile.InvisibleWall, Tile.BlueWall]) {
      const s = createState(fixture([[3, 2, tile]]))
      step(s, 1)
      expect(s.player.pos).toBe(index(2, 2))
      expect(s.tiles[index(3, 2)]).toBe(tile === Tile.HiddenWall ? Tile.Wall : tile)
    }
  })
  test('brown button releases linked trap only while held', () => {
    const s = createState(fixture([[3, 2, Tile.Trap], [7, 7, Tile.BrownButton]], [{ kind: 'block', x: 7, y: 7 }], { traps: [{ button: index(7, 7), target: index(3, 2) }] }))
    step(s, 1); step(s, 1)
    expect(s.player.pos).toBe(index(4, 2))
    const locked = createState(fixture([[3, 2, Tile.Trap]]))
    step(locked, 1); step(locked, 1)
    expect(locked.player.pos).toBe(index(3, 2))
  })
  test('green toggles every wall, blue reverses tanks', () => {
    const s = createState(fixture([[3, 2, Tile.GreenButton], [8, 8, Tile.ToggleWall], [8, 7, Tile.ToggleFloor]]))
    step(s, 1)
    expect(s.tiles[index(8, 8)]).toBe(Tile.ToggleFloor)
    expect(s.tiles[index(8, 7)]).toBe(Tile.ToggleWall)
    const t = createState(fixture([[3, 2, Tile.BlueButton]], [{ kind: 'tank', x: 6, y: 6, dir: 0 }]))
    step(t, 1)
    expect(t.actors[1].dir).toBe(2)
    expect(t.actors[1].pos).toBe(index(6, 7))
  })
  test('red button clones linked actor, blocked cloner emits nothing', () => {
    for (const blocked of [false, true]) {
      const s = createState(fixture([[3, 2, Tile.RedButton], [6, 6, Tile.Clone], ...(blocked ? [[7, 6, Tile.Wall] as [number, number, Tile]] : [])],
        [{ kind: 'tank', x: 6, y: 6, dir: 1 }], { cloners: [{ button: index(3, 2), target: index(6, 6) }] }))
      step(s, 1)
      expect(s.actors.filter(a => a.alive && a.kind === 'tank').length).toBe(blocked ? 1 : 2)
      expect(s.actors[1].pos).toBe(index(6, 6))
      if (!blocked) expect(s.actors.find(a => a.alive && a.kind === 'tank' && !a.clone)?.pos).toBe(index(7, 6))
    }
  })
  test('clone machine emits blocks, and the original template stays intact', () => {
    const s = createState(fixture([[3, 2, Tile.RedButton], [6, 6, Tile.Clone], [7, 6, Tile.Water]],
      [{ kind: 'block', x: 6, y: 6, dir: 1 }], { cloners: [{ button: index(3, 2), target: index(6, 6) }] }))
    step(s, 1)
    expect(s.tiles[index(7, 6)]).toBe(Tile.Dirt)
    expect(s.actors[1].clone).toBe(true)
    expect(s.actors[1].alive).toBe(true)
  })
  test('pushed blocks start sliding next tick, not twice in the push tick', () => {
    const s = createState(fixture([[4, 2, Tile.Ice], [5, 2, Tile.Ice]], [{ kind: 'block', x: 3, y: 2 }]))
    step(s, 1)
    expect(s.actors[1].pos).toBe(index(4, 2))
    tick(s)
    expect(s.actors[1].pos).toBe(index(5, 2))
  })
  test('force-floor directions and random floors are deterministic', () => {
    for (let dir = 0; dir < 4; dir++) {
      const s = createState(fixture())
      s.tiles[s.player.pos] = Tile.ForceN + dir
      tick(s)
      expect(s.player.pos).toBe(index(2, 2) + [-32, 1, 32, -1][dir])
    }
    const a = createState(fixture([[2, 2, Tile.ForceRandom]]))
    const b = createState(fixture([[2, 2, Tile.ForceRandom]]))
    step(a); step(b)
    expect(a.player.pos).toBe(b.player.pos)
  })
  test('MS random force chooses on entry, retains the direction when blocked, excludes monsters and permits blocks', () => {
    const s = createState(fixture([[3, 2, Tile.ForceRandom], [3, 1, Tile.Wall]], [], { seed: 1 }))
    step(s, 1)
    expect(s.player.dir).toBe(0)
    const rng = s.rng
    tick(s); tick(s)
    expect(s.player.pos).toBe(index(3, 2))
    expect(s.rng).toBe(rng)
    const tank = monster('tank', [[6, 5, Tile.ForceRandom]])
    step(tank.s)
    expect(tank.a.pos).toBe(index(6, 6))
    const block = createState(fixture([[4, 2, Tile.ForceRandom]], [{ kind: 'block', x: 3, y: 2 }]))
    step(block, 1)
    expect(block.actors[1].pos).toBe(index(4, 2))
  })
  test('map boundaries do not wrap horizontally or vertically', () => {
    for (const [pos, dir] of [[0, 0], [0, 3], [31, 1], [1023, 2]] as const) {
      const s = createState(fixture())
      s.tiles.fill(Tile.Floor)
      s.player.pos = pos
      step(s, dir)
      expect(s.player.pos).toBe(pos)
    }
  })
  test('teleports skip destinations occupied by an actor', () => {
    const s = createState(fixture([[3, 2, Tile.Teleport], [8, 8, Tile.Teleport], [5, 5, Tile.Teleport]],
      [{ kind: 'block', x: 8, y: 8 }]))
    step(s, 1)
    expect(s.player.pos).toBe(index(6, 5))
  })
  test('MS corner ice permits stepping over the corner with skates', () => {
    const s = createState(fixture([[2, 2, Tile.IceNW]]))
    s.boots[2] = true
    step(s, 0); step(s, 3)
    expect(s.player.pos).toBe(index(1, 1))
  })
  test('actors starting on slide floors are not moved until leaving the initial square', () => {
    for (const tile of [Tile.ForceE, Tile.Ice]) {
      const s = createState(fixture([[2, 2, tile]]))
      step(s)
      expect(s.player.pos).toBe(index(2, 2))
      step(s, 1); step(s, 3); tick(s)
      expect(s.player.pos).toBe(tile === Tile.ForceE ? index(3, 2) : index(1, 2))
    }
  })
})

describe('Microsoft monster personalities', () => {
  test('bug follows left wall, paramecium right wall', () => {
    const bug = monster('bug')
    step(bug.s)
    expect(bug.a.pos).toBe(index(5, 6))
    step(bug.s)
    expect(bug.a.pos).toBe(index(5, 7))
    const p = monster('paramecium')
    step(p.s)
    expect(p.a.pos).toBe(index(7, 6))
    step(p.s)
    expect(p.a.pos).toBe(index(7, 7))
  })
  test('left- and right-wall followers trace opposite sides of a solid pillar', () => {
    const pillar: [number, number, Tile][] = []
    for (let y = 4; y <= 6; y++) for (let x = 4; x <= 6; x++) pillar.push([x, y, Tile.Wall])
    for (const [kind, start, path] of [
      ['bug', [7, 5], [[7, 4], [7, 3], [6, 3], [5, 3], [4, 3], [3, 3], [3, 4], [3, 5]]],
      ['paramecium', [3, 5], [[3, 4], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [7, 4], [7, 5]]]
    ] as const) {
      const s = createState(fixture(pillar, [{ kind, x: start[0], y: start[1], dir: 0 }]))
      for (const [x, y] of path) {
        step(s)
        expect(s.actors[1].pos).toBe(index(x, y))
      }
    }
  })
  test('fireball right-first and glider left-first when forward blocked', () => {
    for (const [kind, x] of [['fireball', 7], ['glider', 5]] as const) {
      const { s, a } = monster(kind, [[6, 5, Tile.Wall]])
      step(s)
      expect(a.pos).toBe(index(x, 6))
    }
  })
  test('fireball and glider try their other turn, then back when both sides are blocked', () => {
    for (const kind of ['fireball', 'glider'] as const) {
      const preferredX = kind === 'fireball' ? 7 : 5
      const { s, a } = monster(kind, [[6, 5, Tile.Wall], [preferredX, 6, Tile.Wall]])
      step(s)
      expect(a.pos).toBe(index(kind === 'fireball' ? 5 : 7, 6))
      const back = monster(kind, [[6, 5, Tile.Wall], [5, 6, Tile.Wall], [7, 6, Tile.Wall]])
      step(back.s)
      expect(back.a.pos).toBe(index(6, 7))
    }
  })
  test('fireball crosses fire and glider crosses water', () => {
    for (const [kind, tile] of [['fireball', Tile.Fire], ['glider', Tile.Water]] as const) {
      const { s, a } = monster(kind, [[6, 5, tile]])
      step(s)
      expect(a.pos).toBe(index(6, 5))
      expect(a.alive).toBe(true)
    }
  })
  test('ball bounces; tank never turns independently', () => {
    for (const kind of ['ball', 'tank'] as const) {
      const { s, a } = monster(kind, [[6, 5, Tile.Wall]])
      step(s)
      expect(a.pos).toBe(index(6, kind === 'ball' ? 7 : 6))
    }
  })
  test('walker walks forward; blocked walker and blob are seeded deterministic', () => {
    const walker = monster('walker')
    step(walker.s)
    expect(walker.a.pos).toBe(index(6, 5))
    for (const kind of ['walker', 'blob'] as const) {
      const one = monster(kind, [[6, 5, Tile.Wall]])
      const two = monster(kind, [[6, 5, Tile.Wall]])
      for (let tick = 0; tick < 10; tick++) { step(one.s); step(two.s) }
      expect(one.a.pos).toBe(two.a.pos)
      expect(one.s.rng).toBe(two.s.rng)
    }
    const blob = monster('blob')
    step(blob.s)
    expect(blob.a.pos).toBe(index(6, 6))
    step(blob.s)
    expect(blob.a.pos).not.toBe(index(6, 6))
  })
  test('teeth pursues major axis first at half speed', () => {
    const { s, a } = monster('teeth')
    s.player.pos = index(2, 5)
    step(s)
    expect(a.pos).toBe(index(6, 6))
    step(s)
    expect(a.pos).toBe(index(5, 6))
  })
  test('teeth falls back to the minor axis when the major axis is blocked', () => {
    const { s, a } = monster('teeth', [[5, 6, Tile.Wall]])
    s.player.pos = index(2, 5)
    step(s); step(s)
    expect(a.pos).toBe(index(6, 5))
  })
  test('MS transparent keys and boots survive monster traversal', () => {
    for (const tile of [Tile.BlueKey, Tile.RedKey, Tile.GreenKey, Tile.YellowKey, Tile.Flippers, Tile.FireBoots, Tile.Skates, Tile.SuctionBoots]) {
      const { s, a } = monster('tank', [[6, 5, tile]])
      step(s)
      expect(a.pos).toBe(index(6, 5))
      expect(s.tiles[index(6, 5)]).toBe(tile)
    }
  })
  test('gravel and dirt exclude monsters; contact kills from either direction', () => {
    for (const tile of [Tile.Gravel, Tile.Dirt]) {
      const { s, a } = monster('tank', [[6, 5, tile]])
      step(s)
      expect(a.pos).toBe(index(6, 6))
    }
    const s = createState(fixture([], [{ kind: 'tank', x: 3, y: 2, dir: 3 }]))
    step(s)
    expect(s.death).toBe('monster')
    const into = createState(fixture([], [{ kind: 'tank', x: 3, y: 2, dir: 1 }]))
    step(into, 1)
    expect(into.death).toBe('monster')
  })
})

describe('progression contracts', () => {
  test('password accepts uppercase/lowercase; rejects foreign and malformed', () => {
    const levels = [fixture()]
    expect(passwordLevel(levels, ' test ')?.number).toBe(1)
    expect(passwordLevel(levels, 'NOPE')).toBeUndefined()
    expect(passwordLevel(levels, 'TESTX')).toBeUndefined()
  })
  test('score is MS-style best-level time plus decaying attempt bonus with floor', () => {
    expect(levelScore(1, 10, 1)).toEqual({ timeBonus: 100, levelBonus: 500, score: 600 })
    expect(levelScore(10, 20, 2).levelBonus).toBe(4000)
    expect(levelScore(10, 20, 6).levelBonus).toBe(levelScore(10, 20, 99).levelBonus)
  })
  test('replay ticks are deterministic and stop at exit', () => {
    const level = fixture([[3, 2, Tile.Exit]], [], { solution: 'EEE' })
    expect(replay(level).status).toBe('won')
    expect(replay(level).tick).toBe(2)
  })
})

describe('typed two-layer level decoder', () => {
  const blueprint = { number: 1, title: 'Fixture', hint: '', password: 'TEST', time: 10, rows: ['@$.OX'], legend: LEGEND, solution: 'EEEEEEEE' }
  test('pads to 32×32, decodes actor layer independently, counts chips and replays', () => {
    const level = buildLevel(blueprint)
    expect(level.bottom).toHaveLength(1024)
    expect(level.bottom[index(0, 0)]).toBe(Tile.Wall)
    expect(level.top).toEqual([{ kind: 'player', x: 1, y: 1, dir: 1 }])
    expect(level.chips).toBe(1)
    expect(replay(level).status).toBe('won')
  })
  test('supports blocks on buttons and explicit required chip counts', () => {
    const level = buildLevel({ ...blueprint, rows: ['@$.OX', 'A'], legend: { ...LEGEND, A: { kind: 'block', tile: Tile.BrownButton } }, chips: 0 })
    expect(level.bottom[index(1, 2)]).toBe(Tile.BrownButton)
    expect(level.top[1].kind).toBe('block')
    expect(level.chips).toBe(0)
  })
  test('rejects unknown symbols and out-of-map blueprints', () => {
    expect(() => buildLevel({ ...blueprint, rows: ['&'] })).toThrow()
    expect(() => buildLevel({ ...blueprint, rows: ['.'.repeat(32)] })).toThrow()
    expect(() => buildLevel({ ...blueprint, rows: Array(32).fill('.') })).toThrow()
  })
})

describe('forty original clubhouse trials', () => {
  test('forty unique numbered maps with valid unique passwords', () => {
    expect(LEVELS).toHaveLength(40)
    expect(new Set(LEVELS.map(level => level.password)).size).toBe(40)
    expect(new Set(LEVELS.map(level => level.title)).size).toBe(40)
    for (const [i, level] of LEVELS.entries()) {
      expect(level.number).toBe(i + 1)
      expect(level.password).toMatch(/^[A-Z]{4}$/)
      expect(passwordLevel(LEVELS, level.password.toLowerCase())?.number).toBe(level.number)
      expect(level.bottom).toHaveLength(1024)
      expect(level.top.filter(actor => actor.kind === 'player')).toHaveLength(1)
      expect(level.bottom.filter(tile => tile === Tile.Chip).length).toBeGreaterThanOrEqual(level.chips)
      expect(level.solution).toMatch(/^[NESW.]+$/)
      expect(level.hint.length).toBeGreaterThan(0)
      expect(level.bottom).toContain(Tile.Exit)
      expect(level.bottom).toContain(Tile.Hint)
    }
  })
  for (let number = 1; number <= 40; number++) {
    test(`recorded level ${number} solution reaches exit before the timer`, () => {
      const level = LEVELS[number - 1]
      const state = replay(level)
      expect({ number, status: state.status, death: state.death, pos: state.player.pos, chipsLeft: state.chipsLeft }).toEqual({
        number, status: 'won', death: undefined, pos: state.player.pos, chipsLeft: 0
      })
      if (level.time > 0) {
        expect(state.timeLeft).toBeGreaterThan(0)
        expect(state.tick * TICK_MS).toBeLessThan(level.time * 1000)
      }
    })
  }
  for (const [number, x, y] of [[23, 10, 10], [27, 1, 6], [30, 11, 2], [36, 2, 1]]) {
    test(`level ${number}'s hint is visited by its recorded solution`, () => {
      const level = LEVELS[number - 1]
      expect(level.bottom[index(x, y)]).toBe(Tile.Hint)
      const state = createState(level)
      const moves: Record<string, Direction> = { N: 0, E: 1, S: 2, W: 3 }
      let sawHint = false
      for (const move of level.solution) {
        tick(state, moves[move])
        if (state.tiles[state.player.pos] === Tile.Hint) sawHint = true
      }
      expect(sawHint).toBe(true)
      expect(state.status).toBe('won')
    })
  }
  test('every exit pocket is separated from the starting room by the Bridge Gate', () => {
    const solid = new Set([Tile.Wall, Tile.Socket, Tile.InvisibleWall, Tile.HiddenWall, Tile.BlueWall])
    for (const level of LEVELS) {
      const player = level.top.find(actor => actor.kind === 'player')!
      const queue = [index(player.x, player.y)]
      const visited = new Set(queue)
      for (let cursor = 0; cursor < queue.length; cursor++) {
        const pos = queue[cursor]
        for (const next of [pos - 32, pos + 32, pos % 32 < 31 ? pos + 1 : -1, pos % 32 > 0 ? pos - 1 : -1]) {
          if (next < 0 || next >= 1024 || visited.has(next) || solid.has(level.bottom[next])) continue
          visited.add(next)
          queue.push(next)
        }
      }
      for (let pos = 0; pos < 1024; pos++) {
        if (level.bottom[pos] === Tile.Exit) expect({ level: level.number, reachable: visited.has(pos) }).toEqual({ level: level.number, reachable: false })
      }
    }
  })
  test('all nine monster personalities feature in original levels', () => {
    const kinds = new Set(LEVELS.flatMap(level => level.top.map(actor => actor.kind)))
    for (const kind of ['bug', 'paramecium', 'fireball', 'glider', 'ball', 'tank', 'walker', 'blob', 'teeth']) expect(kinds.has(kind)).toBe(true)
  })
  test('the campaign introduces every tile type in playable maps', () => {
    const tiles = new Set(LEVELS.flatMap(level => level.bottom))
    for (let tile = Tile.Floor; tile <= Tile.IceSE; tile++) expect({ tile: Tile[tile], present: tiles.has(tile) }).toEqual({ tile: Tile[tile], present: true })
  })
})

describe('original alternating music', () => {
  test('all forty levels cycle the three original themes without recreating Song data', () => {
    expect(LEVEL_SONGS.map(song => song.title)).toEqual(['Clubhouse Theme', 'Canyon Chase', 'Floor Puzzle'])
    for (let level = 1; level <= 40; level++) expect(songForLevel(level)).toBe(LEVEL_SONGS[(level - 1) % 3])
  })
  for (const song of LEVEL_SONGS) {
    test(`${song.title} has a contrasting 32-bar form and valid loop-boundary notes`, () => {
      const bar = song.stepsPerBeat * song.beatsPerBar
      expect(song.length).toBe(bar * 32)
      expect(song.loopStart).toBe(0)
      expect(song.bpm).toBeGreaterThan(0)
      for (const part of song.parts) {
        expect(part.notes.length).toBeGreaterThan(0)
        for (const [start, midi, length, velocity = 0.8] of part.notes) {
          expect(Number.isFinite(start) && start >= 0 && start < song.length).toBe(true)
          expect(Number.isInteger(midi) && midi >= 0 && midi <= 127).toBe(true)
          expect(Number.isFinite(length) && length > 0 && start + length <= song.length).toBe(true)
          expect(Number.isFinite(velocity) && velocity >= 0 && velocity <= 1).toBe(true)
        }
      }
      const phrase = (section: number) => song.parts[0].notes
        .filter(note => note[0] >= section * bar * 8 && note[0] < (section + 1) * bar * 8)
        .map(([start, midi, length]) => [start - section * bar * 8, midi, length])
      expect(phrase(0)).not.toEqual(phrase(1))
      expect(phrase(0)).not.toEqual(phrase(2))
    })
  }
  test('exit fanfare and descending bummer are under three seconds', () => {
    for (const song of [winJingle, deathJingle]) {
      expect(song.length * 60 / (song.bpm * song.stepsPerBeat)).toBeLessThanOrEqual(3)
    }
    const pitches = deathJingle.parts[0].notes.map(note => note[1])
    expect(pitches).toEqual([67, 66, 65, 64])
  })
})
