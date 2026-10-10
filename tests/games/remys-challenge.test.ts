import { describe, expect, test } from 'bun:test'
import { createState, step, replay, passwordLevel, levelScore } from '../../src/games/remys-challenge/engine'
import { Tile, index, type ActorSpec, type Direction, type Level, type MonsterKind } from '../../src/games/remys-challenge/types'

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
    step(s, 2)
    expect(s.player.pos).toBe(index(4, 2))
    step(s)
    expect(s.player.pos).toBe(index(3, 2))
    s.boots[2] = true
    step(s, 2)
    expect(s.player.pos).toBe(index(3, 3))
  })
  test('corner ice redirects, and its solid edges block entry', () => {
    const s = createState(fixture([[3, 2, Tile.IceNE]]))
    step(s, 1)
    step(s)
    expect(s.player.pos).toBe(index(3, 3))
    const blocked = createState(fixture([[3, 2, Tile.IceNW]]))
    step(blocked, 1)
    expect(blocked.player.pos).toBe(index(2, 2))
  })
  test('force floor auto-pushes, orthogonal override and suction boots', () => {
    for (const [override, boots, expected] of [[undefined, false, index(4, 2)], [2, false, index(3, 3)], [3, false, index(4, 2)], [3, true, index(2, 2)]] as const) {
      const s = createState(fixture([[3, 2, Tile.ForceE]]))
      step(s, 1)
      s.boots[3] = boots
      step(s, override)
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
  test('fireball right-first and glider left-first when forward blocked', () => {
    for (const [kind, x] of [['fireball', 7], ['glider', 5]] as const) {
      const { s, a } = monster(kind, [[6, 5, Tile.Wall]])
      step(s)
      expect(a.pos).toBe(index(x, 6))
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
    expect(replay(level).tick).toBe(1)
  })
})
