import { MAP_SIZE, Tile, index, opposite, turnLeft, turnRight, type Actor, type Direction, type Level, type State } from './types'
export { Tile, MAP_SIZE, TICK_MS, index } from './types'
export type { State, Level, Direction, Actor, MonsterKind } from './types'

const DELTAS = [-32, 1, 32, -1]
const wallTiles = new Set([Tile.Wall, Tile.InvisibleWall, Tile.HiddenWall, Tile.BlueWall, Tile.ToggleWall])
const iceTiles = new Set([Tile.Ice, Tile.IceNW, Tile.IceNE, Tile.IceSW, Tile.IceSE])

export function createState(level: Level): State {
  if (level.bottom.length !== 1024) throw new Error('A level must contain 32 × 32 tiles')
  const actors: Actor[] = level.top.map(a => {
    const pos = index(a.x, a.y)
    const tile = level.bottom[pos]
    return { kind: a.kind, pos, dir: a.dir ?? 2, alive: true, trapped: false, clone: tile === Tile.Clone, movedTick: -1,
      initialSlidePos: iceTiles.has(tile) || tile >= Tile.ForceN && tile <= Tile.ForceRandom ? pos : -1 }
  })
  const player = actors.find(a => a.kind === 'player')
  if (!player || actors.filter(a => a.kind === 'player').length !== 1) throw new Error('A level requires exactly one player')
  for (let n = actors.length; n < 1024; n++) actors.push({ kind: 'block', pos: -1, dir: 0, alive: false, trapped: false, clone: false, movedTick: -1, initialSlidePos: -1 })
  return {
    level, tiles: Array.from(level.bottom), actors, player, keys: [0, 0, 0, 0], boots: [false, false, false, false],
    chipsLeft: level.chips, timeLeft: level.time, tick: 0, rng: (level.seed ?? level.number * 7919) >>> 0,
    status: 'playing', events: [], thief: false, randomForce: 0, lastMoveForced: false
  }
}

function random(s: State) {
  s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0
  return s.rng >>> 30
}

function neighbor(pos: number, dir: Direction) {
  if (dir === 0 && pos < 32 || dir === 2 && pos >= 992 || dir === 1 && pos % 32 === 31 || dir === 3 && pos % 32 === 0) return -1
  return pos + DELTAS[dir]
}

function occupant(s: State, pos: number, except?: Actor) {
  for (const actor of s.actors) if (actor.alive && actor.pos === pos && actor !== except) return actor
  return undefined
}

function thin(tile: Tile, edge: Direction) {
  return tile >= Tile.ThinN && tile <= Tile.ThinW ? tile - Tile.ThinN === edge : tile === Tile.ThinSE && (edge === 1 || edge === 2)
}

function trapOpen(s: State, pos: number) {
  for (const link of s.level.traps) if (link.target === pos && occupant(s, link.button)) return true
  return false
}

function allowed(s: State, a: Actor, dir: Direction, pos = a.pos, reveal = false): boolean {
  const target = neighbor(pos, dir)
  if (target < 0 || thin(s.tiles[pos], dir) || thin(s.tiles[target], opposite(dir))) return false
  const tile = s.tiles[target]
  if (wallTiles.has(tile)) {
    if (reveal && a.kind === 'player' && tile === Tile.HiddenWall) s.tiles[target] = Tile.Wall
    return false
  }
  // MS corner ice blocks entry across the corner, but permits a booted actor to step out.
  if (tile === Tile.IceNW && (dir === 1 || dir === 2) || tile === Tile.IceNE && (dir === 2 || dir === 3) ||
    tile === Tile.IceSW && (dir === 0 || dir === 1) || tile === Tile.IceSE && (dir === 0 || dir === 3)) return false
  if (tile === Tile.Clone) return false
  if (a.kind !== 'player') {
    if (tile === Tile.Dirt || tile === Tile.Gravel || tile === Tile.Chip || tile === Tile.Socket || tile === Tile.Exit ||
      tile === Tile.Hint || tile === Tile.FakeBlueWall || tile === Tile.RecessedWall || tile >= Tile.BlueDoor && tile <= Tile.YellowDoor) return false
    if (tile === Tile.Fire && a.kind !== 'fireball' && a.kind !== 'block') return false
  } else {
    if (tile === Tile.Socket && s.chipsLeft > 0) return false
    if (tile >= Tile.BlueDoor && tile <= Tile.YellowDoor && !s.keys[tile - Tile.BlueDoor]) return false
  }
  const other = occupant(s, target, a)
  if (other && a.kind === 'player' && other.kind === 'block') {
    if (s.tiles[other.pos] === Tile.Trap && !trapOpen(s, other.pos) || other.clone) return false
    return allowed(s, other, dir)
  }
  if (other && (a.kind !== 'player' && other.kind !== 'player' || a.kind === 'block')) return false
  return true
}

function kill(s: State, cause: State['death']) {
  if (s.status !== 'playing') return
  s.status = 'dead'
  s.death = cause
  s.events.push('death')
}

function press(s: State, tile: Tile, pos: number) {
  if (tile >= Tile.BrownButton && tile <= Tile.BlueButton) s.events.push('button')
  if (tile === Tile.GreenButton) {
    for (let n = 0; n < 1024; n++) {
      if (s.tiles[n] === Tile.ToggleWall) s.tiles[n] = Tile.ToggleFloor
      else if (s.tiles[n] === Tile.ToggleFloor) s.tiles[n] = Tile.ToggleWall
    }
    s.events.push('toggle')
  } else if (tile === Tile.BlueButton) {
    for (const actor of s.actors) if (actor.alive && actor.kind === 'tank') actor.dir = opposite(actor.dir)
  } else if (tile === Tile.RedButton) {
    for (const link of s.level.cloners) {
      if (link.button !== pos) continue
      const source = occupant(s, link.target)
      if (!source || !source.clone || !allowed(s, source, source.dir)) continue
      const spawned = s.actors.find(actor => !actor.alive)
      if (!spawned) continue
      spawned.kind = source.kind
      spawned.pos = source.pos
      spawned.dir = source.dir
      spawned.alive = true
      spawned.trapped = false
      spawned.clone = false
      spawned.movedTick = -1
      spawned.initialSlidePos = -1
      move(s, spawned, spawned.dir, true)
    }
  }
}

function arrive(s: State, a: Actor, teleport = true) {
  const tile = s.tiles[a.pos]
  const isPlayer = a.kind === 'player'
  if (tile === Tile.Bomb) {
    s.tiles[a.pos] = Tile.Floor
    if (isPlayer) kill(s, 'bomb')
    else a.alive = false
    s.events.push('bomb')
    return
  }
  if (tile === Tile.Water && !(isPlayer && s.boots[0]) && a.kind !== 'glider') {
    if (isPlayer) kill(s, 'water')
    else {
      a.alive = false
      if (a.kind === 'block') s.tiles[a.pos] = Tile.Dirt
    }
    s.events.push('splash')
    return
  }
  if (tile === Tile.Fire && isPlayer && !s.boots[1]) {
    kill(s, 'fire')
    s.events.push('burn')
    return
  }
  if (isPlayer) {
    if (tile === Tile.Chip) {
      s.chipsLeft = Math.max(0, s.chipsLeft - 1)
      s.tiles[a.pos] = Tile.Floor
      s.events.push('chip')
    } else if (tile >= Tile.BlueKey && tile <= Tile.YellowKey) {
      s.keys[tile - Tile.BlueKey]++
      s.tiles[a.pos] = Tile.Floor
      s.events.push('key')
    } else if (tile >= Tile.BlueDoor && tile <= Tile.YellowDoor) {
      if (tile !== Tile.GreenDoor) s.keys[tile - Tile.BlueDoor]--
      s.tiles[a.pos] = Tile.Floor
      s.events.push('door')
    } else if (tile >= Tile.Flippers && tile <= Tile.SuctionBoots) {
      s.boots[tile - Tile.Flippers] = true
      s.tiles[a.pos] = Tile.Floor
      s.events.push('boots')
    } else if (tile === Tile.Thief) {
      s.boots.fill(false)
      s.thief = true
    } else if (tile === Tile.Socket) {
      s.tiles[a.pos] = Tile.Floor
      s.events.push('socket')
    } else if (tile === Tile.Dirt || tile === Tile.FakeBlueWall) s.tiles[a.pos] = Tile.Floor
    else if (tile === Tile.Exit) {
      s.status = 'won'
      s.events.push('exit')
    }
  } else if (tile >= Tile.BlueKey && tile <= Tile.YellowKey) {
    // MS monsters destroy blue keys, but leave other keys and boots intact.
    if (tile === Tile.BlueKey && a.kind !== 'block') s.tiles[a.pos] = Tile.Floor
  }
  if (tile === Tile.Trap) a.trapped = !trapOpen(s, a.pos)
  press(s, tile, a.pos)
  if (tile === Tile.Teleport && teleport && a.alive && s.status === 'playing') {
    const origin = a.pos
    for (let count = 1; count <= 1024; count++) {
      const destination = (origin - count + 1024) % 1024
      if (s.tiles[destination] !== Tile.Teleport || occupant(s, destination, a)) continue
      if (!allowed(s, a, a.dir, destination)) continue
      a.pos = destination
      s.events.push('teleport')
      // Teleporting keeps the entering direction and exits one tile beyond the destination.
      move(s, a, a.dir, true, false)
      break
    }
  }
  const other = occupant(s, a.pos, a)
  if (other && (isPlayer || other.kind === 'player') && a.kind !== 'block' && other.kind !== 'block') kill(s, 'monster')
}

function move(s: State, a: Actor, dir: Direction, bypassTrap = false, teleport = true): boolean {
  if (!a.alive || s.status !== 'playing') return false
  a.dir = dir
  if (!bypassTrap && (a.clone || s.tiles[a.pos] === Tile.Trap && !trapOpen(s, a.pos))) return false
  if (!allowed(s, a, dir, a.pos, true)) return false
  const target = neighbor(a.pos, dir)
  const other = occupant(s, target, a)
  if (other?.kind === 'block' && a.kind === 'player') {
    if (!move(s, other, dir)) return false
    s.events.push('push')
  }
  const oldTile = s.tiles[a.pos]
  if (a.kind === 'player' && (oldTile === Tile.Popup || oldTile === Tile.RecessedWall)) s.tiles[a.pos] = Tile.Wall
  a.pos = target
  a.trapped = false
  a.movedTick = s.tick
  a.initialSlidePos = -1
  if (other && other.kind !== 'block' && (a.kind === 'player' || other.kind === 'player')) {
    kill(s, 'monster')
    return true
  }
  arrive(s, a, teleport)
  return true
}

function forced(s: State, a: Actor): Direction | undefined {
  const tile = s.tiles[a.pos]
  if (a.initialSlidePos === a.pos) return undefined
  if (iceTiles.has(tile) && !(a.kind === 'player' && s.boots[2])) {
    let dir = a.dir
    if (tile === Tile.IceNW) dir = dir === 0 ? 1 : dir === 3 ? 2 : dir
    if (tile === Tile.IceNE) dir = dir === 0 ? 3 : dir === 1 ? 2 : dir
    if (tile === Tile.IceSW) dir = dir === 2 ? 1 : dir === 3 ? 0 : dir
    if (tile === Tile.IceSE) dir = dir === 2 ? 3 : dir === 1 ? 0 : dir
    return dir
  }
  if (tile >= Tile.ForceN && tile <= Tile.ForceRandom && !(a.kind === 'player' && s.boots[3])) {
    return tile === Tile.ForceRandom ? s.randomForce : (tile - Tile.ForceN) as Direction
  }
  return undefined
}

/** Exactly one deterministic 200ms game tick. No wall clock, DOM or audio dependencies. */
export function step(s: State, input?: Direction): State {
  s.events.length = 0
  if (s.status !== 'playing') return s
  s.tick++
  s.randomForce = random(s) as Direction
  if (s.level.time > 0 && s.tick % 5 === 0) {
    s.timeLeft--
    if (s.timeLeft <= 0) { kill(s, 'time'); return s }
    if (s.timeLeft < 15) s.events.push('tick')
  }
  const player = s.player
  const push = forced(s, player)
  if (push !== undefined) {
    const onIce = iceTiles.has(s.tiles[player.pos])
    // In MS, any legal direction may override a force floor after an involuntary move.
    if (!onIce && s.lastMoveForced && input !== undefined && allowed(s, player, input)) {
      move(s, player, input)
      s.lastMoveForced = false
    } else {
      if (!move(s, player, push) && onIce) move(s, player, opposite(push))
      s.lastMoveForced = true
    }
  } else if (input !== undefined) {
    move(s, player, input)
    s.lastMoveForced = false
  }
  if (s.status !== 'playing') return s
  for (const a of s.actors) {
    if (!a.alive || a === player || a.clone || a.movedTick === s.tick) continue
    const slide = forced(s, a)
    if (slide !== undefined) {
      if (!move(s, a, slide) && iceTiles.has(s.tiles[a.pos])) move(s, a, opposite(slide))
      continue
    }
    if (a.kind === 'block' || (a.kind === 'blob' || a.kind === 'teeth') && s.tick % 2 !== 0) continue
    let first: Direction = a.dir
    let second: Direction = a.dir
    let third: Direction = a.dir
    let fourth: Direction = a.dir
    if (a.kind === 'bug') { first = turnLeft(a.dir); second = a.dir; third = turnRight(a.dir); fourth = opposite(a.dir) }
    else if (a.kind === 'paramecium') { first = turnRight(a.dir); second = a.dir; third = turnLeft(a.dir); fourth = opposite(a.dir) }
    else if (a.kind === 'fireball') { second = turnRight(a.dir); third = turnLeft(a.dir); fourth = opposite(a.dir) }
    else if (a.kind === 'glider') { second = turnLeft(a.dir); third = turnRight(a.dir); fourth = opposite(a.dir) }
    else if (a.kind === 'ball') second = third = fourth = opposite(a.dir)
    else if (a.kind === 'walker' && !allowed(s, a, first)) first = second = third = fourth = random(s) as Direction
    else if (a.kind === 'blob') first = second = third = fourth = random(s) as Direction
    else if (a.kind === 'teeth') {
      const dx = player.pos % 32 - a.pos % 32
      const dy = Math.floor(player.pos / 32) - Math.floor(a.pos / 32)
      const horizontal = (dx > 0 ? 1 : 3) as Direction
      const vertical = (dy > 0 ? 2 : 0) as Direction
      first = Math.abs(dx) > Math.abs(dy) ? horizontal : vertical
      second = Math.abs(dx) > Math.abs(dy) ? vertical : horizontal
      if (dx === 0) second = first = vertical
      if (dy === 0) second = first = horizontal
      third = fourth = second
    }
    if (!move(s, a, first) && !move(s, a, second) && !move(s, a, third)) move(s, a, fourth)
    if (s.status !== 'playing') break
  }
  return s
}

export function replay(level: Level, solution = level.solution): State {
  const s = createState(level)
  for (const letter of solution) {
    const dir = 'NESW'.indexOf(letter.toUpperCase())
    step(s, dir < 0 ? undefined : dir as Direction)
    if (s.status !== 'playing') break
  }
  return s
}

export function passwordLevel(levels: readonly Level[], password: string): Level | undefined {
  const normalized = password.trim().toUpperCase()
  return /^[A-Z]{4}$/.test(normalized) ? levels.find(level => level.password === normalized) : undefined
}

export function levelScore(level: number, timeLeft: number, attempts: number) {
  const timeBonus = Math.max(0, timeLeft) * 10
  const levelBonus = Math.floor(level * 500 * Math.pow(.8, Math.min(Math.max(0, attempts - 1), 5)))
  return { timeBonus, levelBonus, score: timeBonus + levelBonus }
}
