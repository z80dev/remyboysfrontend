// Static table geometry shared by physics and the renderer. Pure data, no DOM.
// Logical space: 375×416, y grows toward the drain. Angles are canvas radians (clockwise, y down).
// Layers: -1 = every layer, 0 = playfield, 1 = raised launch ramp.

export const TABLE_WIDTH = 375
export const TABLE_HEIGHT = 416
export const BALL_RADIUS = 7.5
export const GRAVITY = 1100
export const MAX_SPEED = 2000

// Table events emitted by physics. Values are stable; EVENT_NAMES maps them to rules TableEvent strings.
export const EventType = {
  Ramp: 0, // launch ramp completed (apex)
  Reentry: 1, // top re-entry rollover, index 0..2 left to right
  Bumper: 2, // attack bumper, index 0..2
  Drop: 3, // booster drop target knocked down, index 0..2
  Spot: 4, // mission target bank, index 0..2 top to bottom
  Hyperspace: 5, // hyperspace kicker at the top of the left chute
  LeftHazard: 6, // index 0..2
  RightHazard: 7, // index 0..2
  BlackHole: 8, // black hole kicker
  Fuel: 9, // fuel chute rollover (right orbit)
  Wormhole: 10, // index 0 yellow, 1 red, 2 green
  Spinner: 11, // one event per flag revolution
  Satellite: 12, // satellite bumper
  Lane: 13, // in-lane rollover, index 0 left, 1 right
  Outlane: 14, // out-lane rollover, index 0 left, 1 right
  Rebound: 15, // slingshot kick, index 0 left, 1 right
  Warp: 16, // space warp rollover
  Bonus: 17, // bonus lane rollover (top left)
  Engine: 18, // engine/booster spot targets, index 0..2
  Drain: 19, // ball left the table
  Launch: 20 // ball left the plunger lane
} as const
export type EventType = (typeof EventType)[keyof typeof EventType]

export const EVENT_NAMES = [
  'ramp',
  'reentry',
  'bumper',
  'drop',
  'spot',
  'hyperspace',
  'leftHazard',
  'rightHazard',
  'blackhole',
  'fuel',
  'wormhole',
  'spinner',
  'satellite',
  'lane',
  'outlane',
  'rebound',
  'warp',
  'bonus',
  'engine',
  'drain',
  'launch'
] as const
export type EventName = (typeof EVENT_NAMES)[number]

// Element counts per event; SLOT_BASE[event] + index addresses Physics.hitTime for flashes.
export const EVENT_COUNTS = [1, 3, 3, 3, 3, 1, 3, 3, 1, 1, 3, 1, 1, 2, 2, 2, 1, 1, 3, 1, 1] as const
export const SLOT_BASE: readonly number[] = EVENT_COUNTS.reduce<number[]>((a, _, i) => (a.push(i ? a[i - 1] + EVENT_COUNTS[i - 1] : 0), a), [])
export const SLOT_COUNT = SLOT_BASE[SLOT_BASE.length - 1] + EVENT_COUNTS[EVENT_COUNTS.length - 1]
export const slotOf = (event: number, index = 0) => SLOT_BASE[event] + index

export type Layer = -1 | 0 | 1
export type ColliderKind = 'post' | 'drop' | 'gate'

// event -1 = plain wall. impulse = extra outward speed (px/s) added on contact (slings, bumpers).
export interface Segment {
  ax: number
  ay: number
  bx: number
  by: number
  layer: Layer
  event: number
  index: number
  restitution: number
  impulse: number
  kind?: ColliderKind
}
export interface Circle {
  x: number
  y: number
  radius: number
  layer: Layer
  event: number
  index: number
  restitution: number
  impulse: number
  kind?: ColliderKind
}
// Arc wall from start to end, clockwise (increasing canvas radians).
export interface Arc {
  x: number
  y: number
  radius: number
  start: number
  end: number
  layer: Layer
  event: number
  index: number
  restitution: number
  impulse: number
}
export type SensorKind = 'rollover' | 'ramp-enter' | 'ramp-exit' | 'kicker' | 'spinner' | 'drain' | 'launch'
// Circular trigger. rollover/spinner/launch fire on entry; ramp-enter switches to toLayer only when vy < 0,
// ramp-exit switches to toLayer when vy > 0. kicker captures the ball, holds KICKER_HOLD s, then places it
// at exitX/exitY with velocity kickX/kickY. drain fires Drain when the ball centre enters.
export interface Sensor {
  x: number
  y: number
  radius: number
  layer: Layer
  event: number
  index: number
  kind: SensorKind
  toLayer?: 0 | 1
  exitX?: number
  exitY?: number
  kickX?: number
  kickY?: number
}
export interface FlipperDef {
  x: number
  y: number
  length: number
  radius: number // pivot radius
  tipRadius: number
  rest: number // angle at rest
  raised: number // angle fully up
  side: -1 | 1 // -1 left, 1 right
}

export const KICKER_HOLD = 0.7
export const FLIPPER_UP_SPEED = 30
export const FLIPPER_DOWN_SPEED = 15

const W = (ax: number, ay: number, bx: number, by: number, restitution = 0.45, layer: Layer = 0): Segment => ({
  ax,
  ay,
  bx,
  by,
  layer,
  event: -1,
  index: 0,
  restitution,
  impulse: 0
})
const T = (ax: number, ay: number, bx: number, by: number, event: number, index: number, kind?: ColliderKind): Segment => ({
  ax,
  ay,
  bx,
  by,
  layer: 0,
  event,
  index,
  restitution: 0.55,
  impulse: 0,
  kind
})
const R = (ax: number, ay: number, bx: number, by: number) => W(ax, ay, bx, by, 0.3, 1)

// Main arch: centre and radius of the top of the cabinet.
export const ARCH = { x: 187.5, y: 188, radius: 175.5 } as const
export const LEFT_WALL = 12
export const RIGHT_WALL = 363
export const LANE_WALL = 338 // plunger lane separator (playfield right edge)
export const LANE_WALL_TOP = 140
export const PLAYFIELD_CENTRE = 175

export const FLIPPERS: readonly [FlipperDef, FlipperDef] = [
  { x: 120, y: 372, length: 44, radius: 7, tipRadius: 4, rest: 0.52, raised: -0.5, side: -1 },
  { x: 230, y: 372, length: 44, radius: 7, tipRadius: 4, rest: Math.PI - 0.52, raised: Math.PI + 0.5, side: 1 }
]

export const PLUNGER = { x: 350.5, top: 396, travel: 30, width: 14, maxSpeed: 1900 } as const
export const LAUNCH = { x: 350.5, y: 396 - BALL_RADIUS - 0.5 } as const

// Launch ramp (layer 1): up-lane x 84..106, U-turn around (110, 96), down-lane x 114..136.
export const RAMP = {
  laneWidth: 22,
  upX: 95,
  downX: 125,
  bottom: 250,
  exitY: 150,
  turn: { x: 110, y: 96, outer: 26, inner: 4 },
  path: [
    [95, 250],
    [95, 96],
    [110, 76],
    [125, 96],
    [125, 150]
  ] as readonly (readonly [number, number])[]
} as const

export const SLINGS = [
  { a: [60, 284], b: [60, 322], c: [100, 346] },
  { a: [290, 284], b: [290, 322], c: [250, 346] }
] as const

export const SEGMENTS: readonly Segment[] = [
  // cabinet
  W(LEFT_WALL, ARCH.y, LEFT_WALL, 430),
  W(RIGHT_WALL, ARCH.y, RIGHT_WALL, 430),
  W(LANE_WALL, LANE_WALL_TOP, LANE_WALL, 430, 0.3),
  W(LANE_WALL + 2, LANE_WALL_TOP, LANE_WALL + 2, 430, 0.3),
  // left in/out-lane guide and flipper apron
  W(40, 290, 40, 330),
  W(40, 330, 113, 368, 0.2),
  W(12, 384, 40, 400, 0.2),
  W(40, 400, 108, 416, 0.2),
  // right
  W(310, 290, 310, 330),
  W(310, 330, 237, 368, 0.2),
  W(338, 384, 310, 400, 0.2),
  W(310, 400, 242, 416, 0.2),
  // slingshot backs (kicking faces are below with impulse)
  W(SLINGS[0].a[0], SLINGS[0].a[1], SLINGS[0].b[0], SLINGS[0].b[1]),
  W(SLINGS[0].b[0], SLINGS[0].b[1], SLINGS[0].c[0], SLINGS[0].c[1]),
  W(SLINGS[1].a[0], SLINGS[1].a[1], SLINGS[1].b[0], SLINGS[1].b[1]),
  W(SLINGS[1].b[0], SLINGS[1].b[1], SLINGS[1].c[0], SLINGS[1].c[1]),
  { ...W(SLINGS[0].a[0], SLINGS[0].a[1], SLINGS[0].c[0], SLINGS[0].c[1], 0.6), event: EventType.Rebound, index: 0, impulse: 420 },
  { ...W(SLINGS[1].a[0], SLINGS[1].a[1], SLINGS[1].c[0], SLINGS[1].c[1], 0.6), event: EventType.Rebound, index: 1, impulse: 420 },
  // hyperspace chute (left orbit) inner wall
  W(40, 150, 40, 252),
  W(40, 252, 52, 262),
  // fuel chute (right orbit) inner wall
  W(312, 150, 312, 252),
  W(312, 252, 300, 262),
  // re-entry lane guides
  W(185, 58, 185, 80),
  W(215, 58, 215, 80),
  W(245, 58, 245, 80),
  W(275, 58, 275, 80),
  // bonus lane guide (top left)
  W(146, 30, 146, 52),
  // launch ramp rails (layer 1)
  R(84, 250, 84, 96),
  R(106, 250, 106, 96),
  R(114, 96, 114, 150),
  R(136, 96, 136, 150),
  // mission target bank (on chute inner wall, facing right)
  T(42, 160, 42, 174, EventType.Spot, 0),
  T(42, 182, 42, 196, EventType.Spot, 1),
  T(42, 204, 42, 218, EventType.Spot, 2),
  // left hazard bank (angled, above the left in-lane)
  T(54, 262, 64, 272, EventType.LeftHazard, 0),
  T(66, 274, 76, 284, EventType.LeftHazard, 1),
  T(78, 286, 88, 296, EventType.LeftHazard, 2),
  // right hazard bank (on fuel chute inner wall, facing left)
  T(310, 160, 310, 174, EventType.RightHazard, 0),
  T(310, 182, 310, 196, EventType.RightHazard, 1),
  T(310, 204, 310, 218, EventType.RightHazard, 2),
  // engine / booster spot targets (facing down)
  T(146, 172, 160, 172, EventType.Engine, 0),
  T(164, 172, 178, 172, EventType.Engine, 1),
  T(182, 172, 196, 172, EventType.Engine, 2),
  // booster drop bank (kind 'drop': skipped while its Physics.dropTargets bit is set)
  T(146, 250, 160, 250, EventType.Drop, 0, 'drop'),
  T(164, 250, 178, 250, EventType.Drop, 1, 'drop'),
  T(182, 250, 196, 250, EventType.Drop, 2, 'drop'),
  // out-lane ball-save gates (kind 'gate': solid only while Physics.gates bit index is set)
  { ...T(LEFT_WALL, 288, 40, 288, -1, 0, 'gate'), restitution: 0.9, impulse: 500 },
  { ...T(310, 288, LANE_WALL, 288, -1, 1, 'gate'), restitution: 0.9, impulse: 500 }
]

export const CIRCLES: readonly Circle[] = [
  { x: 205, y: 112, radius: 14, layer: 0, event: EventType.Bumper, index: 0, restitution: 0.7, impulse: 380 },
  { x: 247, y: 112, radius: 14, layer: 0, event: EventType.Bumper, index: 1, restitution: 0.7, impulse: 380 },
  { x: 226, y: 146, radius: 14, layer: 0, event: EventType.Bumper, index: 2, restitution: 0.7, impulse: 380 },
  { x: 285, y: 88, radius: 11, layer: 0, event: EventType.Satellite, index: 0, restitution: 0.7, impulse: 320 },
  // lane posts
  { x: 40, y: 290, radius: 3, layer: 0, event: -1, index: 0, restitution: 0.5, impulse: 0 },
  { x: 310, y: 290, radius: 3, layer: 0, event: -1, index: 1, restitution: 0.5, impulse: 0 },
  // ramp U-turn inner post (layer 1)
  { x: RAMP.turn.x, y: RAMP.turn.y, radius: RAMP.turn.inner, layer: 1, event: -1, index: 0, restitution: 0.3, impulse: 0 },
  // centre post between the flippers (kind 'post': solid only while Physics.postRaised)
  { x: PLAYFIELD_CENTRE, y: 394, radius: 5, layer: 0, event: -1, index: 0, restitution: 0.6, impulse: 0, kind: 'post' }
]

export const ARCS: readonly Arc[] = [
  { x: ARCH.x, y: ARCH.y, radius: ARCH.radius, start: Math.PI, end: Math.PI * 2, layer: -1, event: -1, index: 0, restitution: 0.4, impulse: 0 },
  // ramp U-turn outer rail
  { x: RAMP.turn.x, y: RAMP.turn.y, radius: RAMP.turn.outer, start: Math.PI, end: Math.PI * 2, layer: 1, event: -1, index: 0, restitution: 0.3, impulse: 0 }
]

const roll = (x: number, y: number, event: number, index = 0, radius = 6): Sensor => ({ x, y, radius, layer: 0, event, index, kind: 'rollover' })
const kick = (x: number, y: number, event: number, index: number, exitX: number, exitY: number, kickX: number, kickY: number): Sensor => ({
  x,
  y,
  radius: 8,
  layer: 0,
  event,
  index,
  kind: 'kicker',
  exitX,
  exitY,
  kickX,
  kickY
})

export const SENSORS: readonly Sensor[] = [
  roll(200, 68, EventType.Reentry, 0),
  roll(230, 68, EventType.Reentry, 1),
  roll(260, 68, EventType.Reentry, 2),
  roll(130, 42, EventType.Bonus),
  roll(26, 312, EventType.Outlane, 0),
  roll(324, 312, EventType.Outlane, 1),
  roll(50, 304, EventType.Lane, 0),
  roll(300, 304, EventType.Lane, 1),
  roll(PLAYFIELD_CENTRE, 296, EventType.Warp, 0, 7),
  roll(325, 200, EventType.Fuel, 0, 8),
  { x: 325, y: 240, radius: 8, layer: 0, event: EventType.Spinner, index: 0, kind: 'spinner' },
  { x: RAMP.upX, y: RAMP.bottom - 6, radius: 9, layer: 0, event: -1, index: 0, kind: 'ramp-enter', toLayer: 1 },
  { x: RAMP.turn.x, y: RAMP.turn.y - 20, radius: 8, layer: 1, event: EventType.Ramp, index: 0, kind: 'rollover' },
  { x: RAMP.downX, y: RAMP.exitY, radius: 9, layer: 1, event: -1, index: 0, kind: 'ramp-exit', toLayer: 0 },
  kick(26, 136, EventType.Hyperspace, 0, 56, 140, 260, 180),
  kick(232, 196, EventType.BlackHole, 0, 232, 210, -120, 380),
  kick(282, 132, EventType.Wormhole, 0, 282, 146, -160, 300),
  kick(286, 226, EventType.Wormhole, 1, 280, 238, -260, 220),
  kick(108, 300, EventType.Wormhole, 2, 116, 306, 200, 160),
  { x: LAUNCH.x, y: LANE_WALL_TOP + 20, radius: 9, layer: 0, event: EventType.Launch, index: 0, kind: 'launch' },
  // Drain: physics treats this as the horizontal line y > TABLE_HEIGHT + radius across the whole width.
  { x: PLAYFIELD_CENTRE, y: TABLE_HEIGHT + 600, radius: 600, layer: -1, event: EventType.Drain, index: 0, kind: 'drain' }
]

// Light insert positions for the renderer (no collision).
export const FUEL_LIGHTS = [
  [325, 168],
  [325, 154],
  [325, 140],
  [325, 126]
] as const
export const MULTIPLIER_LIGHTS = [
  [143, 322],
  [159, 327],
  [175, 329],
  [191, 327],
  [207, 322]
] as const
export const BUMPER_LEVEL_LIGHTS = [
  [184, 104],
  [181, 118],
  [182, 132],
  [187, 146]
] as const
export const FLAG_LEVEL_LIGHTS = [
  [325, 256],
  [325, 264],
  [325, 272],
  [325, 280]
] as const
export const ENGINE_LEVEL_LIGHTS = [
  [161, 199],
  [168, 199],
  [175, 199],
  [182, 199]
] as const
export const REENTRY_LIGHTS = [
  [200, 90],
  [230, 90],
  [260, 90]
] as const
export const SPOT_LIGHTS = [
  [54, 167],
  [54, 189],
  [54, 211]
] as const
export const LEFT_HAZARD_LIGHTS = [
  [66, 260],
  [78, 272],
  [90, 284]
] as const
export const RIGHT_HAZARD_LIGHTS = [
  [298, 167],
  [298, 189],
  [298, 211]
] as const
export const ENGINE_LIGHTS = [
  [153, 182],
  [171, 182],
  [189, 182]
] as const
export const BONUS_LIGHT = [130, 60] as const
export const RAMP_LIGHT = [95, 258] as const
export const CHUTE_LIGHTS = [
  [26, 230],
  [26, 214],
  [26, 198]
] as const
export const RANK_LIGHTS: readonly (readonly [number, number])[] = Array.from({ length: 9 }, (_, i) => [131 + i * 11, 344] as const)
export const SHOOT_AGAIN = [PLAYFIELD_CENTRE, 380] as const
export const EXTRA_BALL = [56, 140] as const
