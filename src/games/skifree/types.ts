export type Course = 'free' | 'slalom' | 'tree' | 'freestyle'
export type Direction = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type ObstacleKind = 'tree' | 'big-tree' | 'dead-tree' | 'stump' | 'rock' | 'mogul' | 'ramp' | 'rainbow' | 'dog' | 'skier' | 'snowboarder' | 'lift' | 'hydrant' | 'mushroom' | 'yellow-snow' | 'sign' | 'banner' | 'gate'
export type WorldObject = {
  id: number
  kind: ObstacleKind
  x: number
  y: number
  radius: number
  variant: number
  active: boolean
  text?: string
  side?: -1 | 1
}
export type Monster = { x: number; y: number; phase: 'chase' | 'grab' | 'chew' | 'burp' | 'away'; timer: number; active: boolean }
export type GameEvent = 'jump' | 'land' | 'trick' | 'crash' | 'dog' | 'roar' | 'gobble' | 'burp' | 'fast' | 'gate-pass' | 'gate-miss' | 'course-start' | 'course-finish' | 'game-over'
export type SkiState = {
  seed: number
  x: number
  y: number
  direction: Direction
  speed: number
  fast: boolean
  time: number
  distance: number
  style: number
  air: number
  airDuration: number
  trick: 'none' | 'spin' | 'front' | 'back'
  trickProgress: number
  completedTricks: number
  crash: number
  course: Course
  courseStarted: boolean
  courseFinished: boolean
  courseTime: number
  penalties: number
  gateIndex: number
  gameOver: boolean
  objects: WorldObject[]
  monsters: Monster[]
  events: GameEvent[]
  tracks: Float32Array
  trackIndex: number
  stepCount: number
}
export type SkiCommand = 'left' | 'right' | 'down' | 'up' | 'diagonal-left' | 'diagonal-right' | 'horizontal-left' | 'horizontal-right' | 'jump' | 'fast'
export type SkiArt = {
  heads: { front: CanvasImageSource; side: CanvasImageSource; rect(idx: number): { sx: number; sy: number; sw: number; sh: number } } | null
  remy: number
  cabald: number
  shirt: string
  snowboard: boolean
  /** CSS pixels per world pixel; HUD remains native CSS size on Pocket. */
  displayScale?: number
}
