// Remy's Challenge — design data for the 40 original levels (source of truth for the level encoder).
//
// MAP: `map` rows are the BOTTOM layer, top-left cell = (0,0), x = column, y = row. Rows may be narrower/shorter than 32;
// every cell outside the drawn rectangle is Wall. Two top-layer shorthands sit on Floor: `P` player, `X` block.
// Every other top-layer actor (all monsters, blocks/monsters on a non-Floor tile, clone-machine templates) is listed
// in `top` as [kind, x, y, facing]; the map shows the tile underneath it.
// LINKS: `traps` = [brownButtonX, brownButtonY, trapX, trapY]; `cloners` = [redButtonX, redButtonY, cloneX, cloneY].
// ROUTE: space-separated tokens replayed from the start: `x,y` = shortest walk to that cell over plain safe tiles
// (floor/items/dirt/gravel/hint/open toggle/thin walls, hazards only with the matching boots, doors only with a key);
// `NESW.` strings are literal ticks; `E4` = EEEE, `.6` = six waits. Ticks while ice/force/teleport moves the player
// are implied (encoder appends '.' until the player is free). Routes were replayed in a throwaway simulator with the
// engine semantics agreed with TeamChips; monster timing may need a few '.' adjustments in the real engine.
//
// ICE CORNERS (7 9 1 3 = numpad): the digit names the two walled edges. IceNW (7) has walls on its north and west
// edges: sliding north into it turns east, sliding west into it turns south; it cannot be entered moving south or east.
// THIN WALLS: 8/6/2/4 = wall on the N/E/S/W edge of that tile, 5 = S and E edges.
import { Tile, type MonsterKind } from '../types'

export const LEGEND: Readonly<Record<string, Tile>> = {
  '.': Tile.Floor, '#': Tile.Wall, c: Tile.Chip, '=': Tile.Socket, E: Tile.Exit,
  '~': Tile.Water, F: Tile.Fire, _: Tile.Ice, '^': Tile.ForceN, '>': Tile.ForceE, v: Tile.ForceS, '<': Tile.ForceW, '%': Tile.ForceRandom,
  b: Tile.BlueKey, r: Tile.RedKey, g: Tile.GreenKey, y: Tile.YellowKey, B: Tile.BlueDoor, R: Tile.RedDoor, G: Tile.GreenDoor, Y: Tile.YellowDoor,
  f: Tile.Flippers, h: Tile.FireBoots, k: Tile.Skates, u: Tile.SuctionBoots,
  d: Tile.Dirt, ':': Tile.Gravel, '*': Tile.Bomb, T: Tile.Trap, C: Tile.Clone,
  t: Tile.BrownButton, m: Tile.RedButton, o: Tile.GreenButton, z: Tile.BlueButton, W: Tile.ToggleWall, w: Tile.ToggleFloor,
  O: Tile.Teleport, '&': Tile.Thief, '?': Tile.Hint,
  p: Tile.Popup, j: Tile.RecessedWall, i: Tile.InvisibleWall, H: Tile.HiddenWall, Q: Tile.BlueWall, q: Tile.FakeBlueWall,
  8: Tile.ThinN, 6: Tile.ThinE, 2: Tile.ThinS, 4: Tile.ThinW, 5: Tile.ThinSE,
  7: Tile.IceNW, 9: Tile.IceNE, 1: Tile.IceSW, 3: Tile.IceSE,
  P: Tile.Floor, X: Tile.Floor,
}

export type Facing = 'N' | 'E' | 'S' | 'W'
export type TopSpec = readonly [kind: MonsterKind | 'block' | 'player', x: number, y: number, facing: Facing]
export type LinkSpec = readonly [buttonX: number, buttonY: number, targetX: number, targetY: number]

export interface LevelDesign {
  number: number
  title: string
  password: string
  /** seconds; 0 = untimed ("---") */
  time: number
  /** chips required to open the socket (may be fewer than chips on the map) */
  chips: number
  hint: string
  /** what the level teaches/tests and how its parts depend on each other */
  intent: string
  map: readonly string[]
  top: readonly TopSpec[]
  traps: readonly LinkSpec[]
  cloners: readonly LinkSpec[]
  route: string
  /** rng seed for blobs, walkers and random force floors */
  seed?: number
}

export const LEVELS: readonly LevelDesign[] = [
  {
    number: 1,
    title: 'LESSON 1: GM',
    password: 'BALD',
    time: 0,
    chips: 4,
    hint: 'Collect every fREMY chip. When CHIPS LEFT reads 0, the Bridge Gate opens. Then walk into the exit.',
    intent: 'Walking, chips, socket, exit, hint tile. Four corner chips around a central gate; the start square sits on the hint.',
    map: [
      '###############',
      '#c....###....c#',
      '#.##.......##.#',
      '#.#..#####..#.#',
      '#....#.E.#....#',
      '##.#.##=##.#.##',
      '#......?......#',
      '#.##.##P##.##.#',
      '#c.#.......#.c#',
      '###############',
    ],
    top: [],
    traps: [],
    cloners: [],
    route: '7,6 1,1 13,1 13,8 1,8 7,4',
  },
  {
    number: 2,
    title: 'LESSON 2: KEYS TO THE VAULT',
    password: 'VALT',
    time: 150,
    chips: 9,
    hint: 'Keys open doors of their own colour. Blue, red and yellow keys are used up. One green key opens every green door.',
    intent: 'Keys and doors as a chain: blue key -> blue door -> red key -> red door -> green key, which then opens three green '
      + 'doors into the three lower vaults (proving green is reusable). The yellow key waits in the left vault and opens the exit vault on the right.',
    map: [
      '###################',
      '#c.....#.....#...c#',
      '#.P.?..B..r..R..g.#',
      '#b.....#.....#....#',
      '###G#####G#######G#',
      '#c..#c.....c#.....#',
      '#.y.#...c...#.###Y#',
      '#...#c.....c#c#E=.#',
      '###################',
    ],
    top: [],
    traps: [],
    cloners: [],
    route: '4,2 1,3 1,1 10,2 16,2 17,1 1,5 2,6 5,5 8,6 5,7 11,7 11,5 13,7 17,7 15,7',
  },
  {
    number: 3,
    title: 'LESSON 3: HOPIUM BOOTS',
    password: 'HOPE',
    time: 120,
    chips: 5,
    hint: 'Water drowns and fire burns. Flippers let you swim; Fire Boots let you walk through fire. Boots last all level.',
    intent: 'Flippers sit in the start room; the lake holds two chip islets and the Fire Boots islet; the fire field east of the lake holds '
      + 'two chips, the gate and the exit. Order is forced: flippers -> lake -> boots -> fire.',
    map: [
      '#####################',
      '#.....#~~~~~~~#FFFFc#',
      '#.P.?.#~c~~~h~#FcFFF#',
      '#.....~~~~~~~~#FFF=E#',
      '#..f..#~~~c~~~FFFFFF#',
      '#.....#~~~~~~~#FcFFF#',
      '#####################',
    ],
    top: [],
    traps: [],
    cloners: [],
    route: '4,2 3,4 8,2 12,2 10,4 16,2 19,1 16,5 19,3',
  },
  {
    number: 4,
    title: 'LESSON 4: BLOCK PARTY',
    password: 'PUSH',
    time: 150,
    chips: 5,
    hint: 'Walk into a block to push it. A block pushed into water becomes dirt; step on dirt and it is just floor.',
    intent: 'Three uses of a block: (2,5) is pushed down the shaft twice to reach the chip at (1,7); (6,2) is pushed four tiles east into '
      + 'the river at (10,2) to build a dirt bridge; (14,3) plugs the gap to the north-east room and is shoved in; (12,6) fills the moat '
      + 'at (14,6) in front of the gate. The block at (6,4) is a spare for a second river crossing.',
    map: [
      '####################',
      '#c..#.....~...#...c#',
      '#.P.#.X...~..c#....#',
      '#.?.......~...X....#',
      '#...#.X...~...#..c.#',
      '##X##.....~...######',
      '#...#.....~.X.~..=E#',
      '#c..#######...######',
      '####################',
    ],
    top: [],
    traps: [],
    cloners: [],
    route: '2,3 2,4 S S 1,6 1,7 1,1 5,2 E4 13,2 13,3 E E 18,1 17,4 11,6 E E 18,6',
  },
]
