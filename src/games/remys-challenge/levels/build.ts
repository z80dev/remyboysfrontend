import { Tile, index, type ActorSpec, type Level, type Link } from '../types'

export type LegendEntry = Tile | { tile?: Tile; kind: ActorSpec['kind']; dir?: ActorSpec['dir'] }
export interface LevelBlueprint {
  number: number
  title: string
  hint: string
  password: string
  rows: readonly string[]
  legend: Readonly<Record<string, LegendEntry>>
  time: number
  chips?: number
  solution: string
  offset?: readonly [number, number]
  traps?: readonly Link[]
  cloners?: readonly Link[]
  seed?: number
}

/** Decode an original compact two-layer map. Omitted outer cells are solid wall. */
export function buildLevel(blueprint: LevelBlueprint): Level {
  const bottom = Array<Tile>(1024).fill(Tile.Wall)
  const top: ActorSpec[] = []
  const [ox, oy] = blueprint.offset ?? [1, 1]
  let chips = 0
  if (blueprint.rows.length + oy > 32) throw new Error(`Level ${blueprint.number} exceeds map height`)
  for (let y = 0; y < blueprint.rows.length; y++) {
    const row = blueprint.rows[y]
    if (row.length + ox > 32) throw new Error(`Level ${blueprint.number} exceeds map width`)
    for (let x = 0; x < row.length; x++) {
      const symbol = row[x]
      const entry = blueprint.legend[symbol]
      if (entry === undefined) throw new Error(`Unknown level ${blueprint.number} symbol: ${symbol}`)
      const tile = typeof entry === 'number' ? entry : entry.tile ?? Tile.Floor
      bottom[index(x + ox, y + oy)] = tile
      if (tile === Tile.Chip) chips++
      if (typeof entry !== 'number') top.push({ kind: entry.kind, x: x + ox, y: y + oy, dir: entry.dir })
    }
  }
  return {
    number: blueprint.number, title: blueprint.title, hint: blueprint.hint, password: blueprint.password,
    time: blueprint.time, chips: blueprint.chips ?? chips, bottom, top, solution: blueprint.solution,
    traps: blueprint.traps ?? [], cloners: blueprint.cloners ?? [], seed: blueprint.seed
  }
}

export const LEGEND: Readonly<Record<string, LegendEntry>> = {
  '#': Tile.Wall, ' ': Tile.Wall, '.': Tile.Floor, '@': { kind: 'player', dir: 1 }, '$': Tile.Chip,
  'O': Tile.Socket, 'X': Tile.Exit, '~': Tile.Water, '*': Tile.Fire, '_': Tile.Ice,
  '^': Tile.ForceN, '>': Tile.ForceE, 'v': Tile.ForceS, '<': Tile.ForceW, '?': Tile.Hint,
  'b': Tile.BlueKey, 'r': Tile.RedKey, 'g': Tile.GreenKey, 'y': Tile.YellowKey,
  'B': Tile.BlueDoor, 'R': Tile.RedDoor, 'G': Tile.GreenDoor, 'Y': Tile.YellowDoor,
  'f': Tile.Flippers, 'h': Tile.FireBoots, 'i': Tile.Skates, 's': Tile.SuctionBoots,
  '+': { kind: 'block' }, ',': Tile.Gravel, ':': Tile.Dirt, '!': Tile.Bomb,
  'T': Tile.Trap, 'C': Tile.Clone, 'n': Tile.BrownButton, 'd': Tile.RedButton,
  't': Tile.GreenButton, 'u': Tile.BlueButton, 'w': Tile.ToggleWall, 'a': Tile.ToggleFloor,
  'o': Tile.Teleport, 'z': Tile.Thief, 'p': Tile.Popup, 'I': Tile.InvisibleWall,
  'H': Tile.HiddenWall, 'Q': Tile.BlueWall, 'q': Tile.FakeBlueWall, 'j': Tile.RecessedWall
}
