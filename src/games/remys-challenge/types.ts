export const MAP_SIZE = 32
export const TICK_MS = 200
export type Direction = 0 | 1 | 2 | 3 // north, east, south, west
export enum Tile {
  Floor, Wall, Chip, Socket, Exit, Water, Fire, Ice, ForceN, ForceE, ForceS, ForceW, ForceRandom,
  BlueKey, RedKey, GreenKey, YellowKey, BlueDoor, RedDoor, GreenDoor, YellowDoor,
  Flippers, FireBoots, Skates, SuctionBoots, Dirt, Gravel, Bomb, Trap, Clone,
  BrownButton, RedButton, GreenButton, BlueButton, ToggleWall, ToggleFloor, Teleport, Thief, Hint,
  Popup, InvisibleWall, HiddenWall, BlueWall, FakeBlueWall, ThinN, ThinE, ThinS, ThinW, ThinSE,
  RecessedWall, IceNW, IceNE, IceSW, IceSE
}
export type MonsterKind = 'bug' | 'paramecium' | 'fireball' | 'glider' | 'ball' | 'tank' | 'walker' | 'blob' | 'teeth'
export interface ActorSpec { kind: 'player' | 'block' | MonsterKind; x: number; y: number; dir?: Direction }
export interface Link { button: number; target: number }
export interface Level {
  number: number
  title: string
  password: string
  hint: string
  time: number // 0 = untimed
  chips: number
  bottom: readonly Tile[] // exactly 1024 entries
  top: readonly ActorSpec[]
  traps: readonly Link[]
  cloners: readonly Link[]
  solution: string // one 200 ms tick per N/E/S/W/. character
  seed?: number
}
export interface Actor { kind: ActorSpec['kind']; pos: number; dir: Direction; alive: boolean; trapped: boolean; clone: boolean }
export type Death = 'fire' | 'water' | 'monster' | 'bomb' | 'time'
export type GameEvent = 'chip' | 'socket' | 'door' | 'key' | 'boots' | 'push' | 'splash' | 'burn' | 'bomb' | 'teleport' | 'button' | 'toggle' | 'death' | 'exit' | 'tick'
export interface State {
  level: Level
  tiles: Tile[]
  actors: Actor[]
  player: Actor
  keys: number[]
  boots: boolean[]
  chipsLeft: number
  timeLeft: number
  tick: number
  rng: number
  status: 'playing' | 'dead' | 'won'
  death?: Death
  events: GameEvent[]
  thief: boolean
  randomForce: Direction
}
export const index = (x: number, y: number) => y * MAP_SIZE + x
export const opposite = (d: Direction) => ((d + 2) % 4) as Direction
export const turnLeft = (d: Direction) => ((d + 3) % 4) as Direction
export const turnRight = (d: Direction) => ((d + 1) % 4) as Direction
