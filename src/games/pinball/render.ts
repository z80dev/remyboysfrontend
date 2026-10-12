// Table renderer: a static layer painted once (×scale) plus a zero-allocation dynamic pass.
import { mulberry32 } from '../kit'
import {
  ARCH,
  ARCS,
  BALL_RADIUS,
  BONUS_LIGHT,
  BUMPER_LEVEL_LIGHTS,
  CHUTE_LIGHTS,
  CIRCLES,
  ENGINE_LEVEL_LIGHTS,
  ENGINE_LIGHTS,
  EXTRA_BALL,
  EventType,
  FLAG_LEVEL_LIGHTS,
  FLIPPERS,
  FUEL_LIGHTS,
  LAUNCH,
  LANE_WALL,
  LANE_WALL_TOP,
  LEFT_HAZARD_LIGHTS,
  LEFT_WALL,
  MULTIPLIER_LIGHTS,
  PLAYFIELD_CENTRE,
  PLUNGER,
  RAMP,
  RAMP_LIGHT,
  RANK_LIGHTS,
  REENTRY_LIGHTS,
  RIGHT_HAZARD_LIGHTS,
  RIGHT_WALL,
  SEGMENTS,
  SENSORS,
  SHOOT_AGAIN,
  SLINGS,
  SPOT_LIGHTS,
  TABLE_HEIGHT,
  TABLE_WIDTH,
  slotOf
} from './geometry'
import { STRINGS, TABLE_LABELS } from './strings'

type Lights = number | ArrayLike<boolean | number>

/** Fields the renderer reads from the physics state. */
export interface PhysicsView {
  ball: { x: number; y: number; radius: number; height: number; layer: number; active: boolean }
  visualLeftAngle: number
  visualRightAngle: number
  plunger: number
  time: number
  postRaised: boolean
  tilted: boolean
  dropTargets: number
  gates: number
  hitTime: Float32Array
  spinnerAngle: number
}

/** Fields the renderer reads from the rules Game. Light groups may be bitmasks or boolean arrays. */
export interface GameView {
  reentryLights: Lights
  spotTargets: Lights
  leftHazards: Lights
  rightHazards: Lights
  engineTargets: Lights
  bumperLevel: number
  engineLevel: number
  flagLevel: number
  fuel: number
  multiplier: number
  extraBallLit: boolean
  wormholeColor: number
  mission: { id: string } | null
  tilted: boolean
  launchedAt: number
  ballSaveUsed: boolean
  time: number
  rank?: number
  player?: { rank: number }
  phase: 'ready' | 'playing' | 'over'
  hyperspaceCount?: number
}

export interface TableArt {
  bumpers: (HTMLImageElement | undefined)[]
  rugLord?: HTMLImageElement
}

const FONT = 'Tahoma, Verdana, sans-serif'
const C = {
  yellow: '#ffd23a',
  red: '#ff3a3a',
  green: '#4dff6a',
  cyan: '#3af0ff',
  orange: '#ff8a1a',
  magenta: '#ff5ae0',
  violet: '#b060ff',
  gold: '#ffd24a',
  fuel: '#3aff9a'
} as const
const WORMHOLE_COLORS = [C.yellow, C.red, C.green] as const
const BALL_SAVE_SECONDS = 10
// Visual travel keeps the knob and ready ball above the apron; launch strength remains the physics fraction.
const VISIBLE_PLUNGER_TRAVEL = Math.min(PLUNGER.travel, TABLE_HEIGHT - 6 - PLUNGER.top)
const PLUNGER_METER_X = LANE_WALL + 3
const PLUNGER_METER_BOTTOM = 390
const PLUNGER_METER_SEGMENTS = 5

interface Sprites {
  scale: number
  ball: HTMLCanvasElement
  flipperL: HTMLCanvasElement
  flipperR: HTMLCanvasElement
  bumper: HTMLCanvasElement
  bumperLit: HTMLCanvasElement
  glow: Record<string, HTMLCanvasElement>
  ramp: HTMLCanvasElement
}
let sprites: Sprites | null = null

function makeCanvas(w: number, h: number, scale: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = Math.ceil(w * scale)
  c.height = Math.ceil(h * scale)
  const ctx = c.getContext('2d') as CanvasRenderingContext2D
  ctx.scale(scale, scale)
  return [c, ctx]
}

// ---------- static helpers (allocation is fine here: they run once per layer) ----------

function playfieldPath(ctx: CanvasRenderingContext2D, fresh = true) {
  if (fresh) ctx.beginPath()
  ctx.moveTo(LEFT_WALL, TABLE_HEIGHT)
  ctx.lineTo(LEFT_WALL, ARCH.y)
  ctx.arc(ARCH.x, ARCH.y, ARCH.radius, Math.PI, Math.PI * 2)
  ctx.lineTo(RIGHT_WALL, TABLE_HEIGHT)
  ctx.closePath()
}

function chrome(ctx: CanvasRenderingContext2D, trace: () => void, width = 4) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = 'rgba(0,0,10,0.55)'
  ctx.lineWidth = width + 2
  ctx.save()
  ctx.translate(1.5, 2)
  trace()
  ctx.stroke()
  ctx.restore()
  ctx.strokeStyle = '#2a3150'
  ctx.lineWidth = width
  trace()
  ctx.stroke()
  ctx.strokeStyle = '#9aa8c8'
  ctx.lineWidth = width * 0.6
  trace()
  ctx.stroke()
  ctx.strokeStyle = 'rgba(245,250,255,0.95)'
  ctx.lineWidth = Math.max(0.8, width * 0.22)
  ctx.save()
  ctx.translate(-0.5, -0.6)
  trace()
  ctx.stroke()
  ctx.restore()
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, rot = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.font = `bold ${size}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(0,0,0,0.7)'
  ctx.fillText(text, 0.6, 0.7)
  ctx.fillStyle = color
  ctx.fillText(text, 0, 0)
  ctx.restore()
}

// Unlit insert: tinted glass over a dark well with a chrome bezel.
function lamp(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, shape: 'round' | 'arrow' | 'diamond' = 'round', rot = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.beginPath()
  if (shape === 'round') ctx.arc(0, 0, r, 0, Math.PI * 2)
  else if (shape === 'diamond') {
    ctx.moveTo(0, -r * 1.3)
    ctx.lineTo(r, 0)
    ctx.lineTo(0, r * 1.3)
    ctx.lineTo(-r, 0)
    ctx.closePath()
  } else {
    ctx.moveTo(0, -r * 1.4)
    ctx.lineTo(r, r * 0.6)
    ctx.lineTo(0, r * 0.2)
    ctx.lineTo(-r, r * 0.6)
    ctx.closePath()
  }
  ctx.fillStyle = '#05070f'
  ctx.fill()
  ctx.globalAlpha = 0.38
  ctx.fillStyle = color
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.lineWidth = 0.8
  ctx.strokeStyle = 'rgba(200,215,240,0.75)'
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.beginPath()
  ctx.arc(-r * 0.3, -r * 0.35, r * 0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function hole(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rim: string) {
  const g = ctx.createRadialGradient(x - 1, y - 1, 1, x, y, r + 3)
  g.addColorStop(0, '#000')
  g.addColorStop(0.6, '#03040a')
  g.addColorStop(0.8, rim)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r + 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(230,240,255,0.8)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(x, y, r + 1, Math.PI * 0.9, Math.PI * 1.9)
  ctx.stroke()
}

function makeGlow(color: string, scale: number) {
  const [c, ctx] = makeCanvas(24, 24, scale)
  const g = ctx.createRadialGradient(12, 12, 0, 12, 12, 12)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.18, color)
  g.addColorStop(0.45, color + '88')
  g.addColorStop(1, color + '00')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 24, 24)
  return c
}

function makeBall(scale: number) {
  const s = 20
  const [c, ctx] = makeCanvas(s, s, scale)
  const m = s / 2
  const r = BALL_RADIUS
  ctx.beginPath()
  ctx.arc(m, m, r, 0, Math.PI * 2)
  ctx.save()
  ctx.clip()
  // Environment map: sky, horizon, reflected blue table.
  const env = ctx.createLinearGradient(0, m - r, 0, m + r)
  env.addColorStop(0, '#f4f8ff')
  env.addColorStop(0.32, '#a9c4f0')
  env.addColorStop(0.48, '#3a4f86')
  env.addColorStop(0.52, '#101a38')
  env.addColorStop(0.75, '#2c4aa8')
  env.addColorStop(1, '#a6b6d8')
  ctx.fillStyle = env
  ctx.fillRect(0, 0, s, s)
  const shade = ctx.createRadialGradient(m - 2, m - 2.5, r * 0.3, m, m, r * 1.05)
  shade.addColorStop(0, 'rgba(0,0,0,0)')
  shade.addColorStop(0.75, 'rgba(0,0,20,0.1)')
  shade.addColorStop(1, 'rgba(0,0,20,0.55)')
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, s, s)
  ctx.restore()
  const spec = ctx.createRadialGradient(m - 2.6, m - 3.2, 0, m - 2.6, m - 3.2, 3.2)
  spec.addColorStop(0, 'rgba(255,255,255,1)')
  spec.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = spec
  ctx.beginPath()
  ctx.arc(m - 2.6, m - 3.2, 3.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,240,200,0.6)'
  ctx.beginPath()
  ctx.arc(m + 3, m + 3.4, 1, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(10,15,40,0.6)'
  ctx.lineWidth = 0.6
  ctx.beginPath()
  ctx.arc(m, m, r - 0.3, 0, Math.PI * 2)
  ctx.stroke()
  return c
}

// Flipper sprite along +x with its pivot at (PAD + r0, PAD + r0). lightTop picks the side of the bevel highlight.
const FLIP_PAD = 2
function makeFlipper(scale: number, lightTop: boolean) {
  const f = FLIPPERS[0]
  const r0 = f.radius
  const r1 = f.tipRadius
  const w = f.length + r0 + r1 + FLIP_PAD * 2
  const h = r0 * 2 + FLIP_PAD * 2
  const [c, ctx] = makeCanvas(w, h, scale)
  ctx.translate(FLIP_PAD + r0, FLIP_PAD + r0)
  const trace = () => {
    ctx.beginPath()
    ctx.arc(0, 0, r0, Math.PI / 2, Math.PI * 1.5)
    ctx.lineTo(f.length, -r1)
    ctx.arc(f.length, 0, r1, -Math.PI / 2, Math.PI / 2)
    ctx.closePath()
  }
  trace()
  const g = ctx.createLinearGradient(0, -r0, 0, r0)
  const hi = '#ffffff'
  const lo = '#5d6888'
  g.addColorStop(0, lightTop ? hi : lo)
  g.addColorStop(0.45, '#c9d3ea')
  g.addColorStop(1, lightTop ? lo : hi)
  ctx.fillStyle = g
  ctx.fill()
  ctx.lineWidth = 1.8
  ctx.strokeStyle = '#d42032'
  ctx.stroke()
  ctx.lineWidth = 0.6
  ctx.strokeStyle = 'rgba(255,160,170,0.8)'
  ctx.stroke()
  ctx.fillStyle = '#20263c'
  ctx.beginPath()
  ctx.arc(0, 0, 2.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#e8eefc'
  ctx.beginPath()
  ctx.arc(-0.6, -0.6, 1, 0, Math.PI * 2)
  ctx.fill()
  return c
}

function makeBumper(scale: number, lit: boolean) {
  const [c, ctx] = makeCanvas(36, 36, scale)
  const m = 18
  // skirt
  ctx.fillStyle = lit ? '#ffe9a0' : '#c7cfe4'
  ctx.beginPath()
  ctx.arc(m, m, 15.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#3c4462'
  ctx.lineWidth = 1
  ctx.stroke()
  // cap ring
  const g = ctx.createRadialGradient(m - 4, m - 5, 1, m, m, 13)
  g.addColorStop(0, lit ? '#ffffff' : '#ffb6c4')
  g.addColorStop(0.5, lit ? '#ff7a8a' : '#d0213c')
  g.addColorStop(1, lit ? '#b0102a' : '#560818')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(m, m, 12.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#0b1230'
  ctx.beginPath()
  ctx.arc(m, m, 8.5, 0, Math.PI * 2)
  ctx.fill()
  return c
}

function makeRamp(scale: number) {
  const [c, ctx] = makeCanvas(TABLE_WIDTH, TABLE_HEIGHT, scale)
  const t = RAMP.turn
  const outline = () => {
    ctx.beginPath()
    ctx.moveTo(84, RAMP.bottom)
    ctx.lineTo(84, t.y)
    ctx.arc(t.x, t.y, t.outer, Math.PI, Math.PI * 2)
    ctx.lineTo(136, RAMP.exitY)
    ctx.lineTo(114, RAMP.exitY)
    ctx.lineTo(114, t.y)
    ctx.arc(t.x, t.y, t.inner, 0, Math.PI, true)
    ctx.lineTo(106, RAMP.bottom)
    ctx.closePath()
  }
  // drop shadow on the playfield
  ctx.save()
  ctx.translate(4, 6)
  outline()
  ctx.fillStyle = 'rgba(0,0,12,0.35)'
  ctx.fill()
  ctx.restore()
  outline()
  const g = ctx.createLinearGradient(84, 0, 136, 0)
  g.addColorStop(0, 'rgba(90,170,255,0.42)')
  g.addColorStop(0.5, 'rgba(160,220,255,0.22)')
  g.addColorStop(1, 'rgba(60,120,255,0.42)')
  ctx.fillStyle = g
  ctx.fill()
  // plastic sheen
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(88, RAMP.bottom - 4)
  ctx.lineTo(88, t.y)
  ctx.stroke()
  // printed chevrons and lettering
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  for (let y = 230; y > 120; y -= 22) {
    ctx.beginPath()
    ctx.moveTo(95, y - 5)
    ctx.lineTo(101, y + 2)
    ctx.lineTo(95, y - 1)
    ctx.lineTo(89, y + 2)
    ctx.closePath()
    ctx.fill()
  }
  label(ctx, TABLE_LABELS.launchRamp, 95, 175, 6, '#eaf6ff', -Math.PI / 2)
  // rails
  chrome(
    ctx,
    () => {
      ctx.beginPath()
      ctx.moveTo(84, RAMP.bottom)
      ctx.lineTo(84, t.y)
      ctx.arc(t.x, t.y, t.outer, Math.PI, Math.PI * 2)
      ctx.lineTo(136, RAMP.exitY)
      ctx.moveTo(106, RAMP.bottom)
      ctx.lineTo(106, t.y)
      ctx.arc(t.x, t.y, t.inner, Math.PI, 0)
      ctx.lineTo(114, RAMP.exitY)
    },
    2.6
  )
  return c
}

function ensureSprites(scale: number): Sprites {
  if (sprites && sprites.scale === scale) return sprites
  const glow: Record<string, HTMLCanvasElement> = {}
  for (const color of Object.values(C)) glow[color] = makeGlow(color, scale)
  glow['#ffffff'] = makeGlow('#ffffff', scale)
  sprites = {
    scale,
    ball: makeBall(scale),
    flipperL: makeFlipper(scale, true),
    flipperR: makeFlipper(scale, false),
    bumper: makeBumper(scale, false),
    bumperLit: makeBumper(scale, true),
    glow,
    ramp: makeRamp(scale)
  }
  return sprites
}

/** Paint the static table once at device scale. Returns a TABLE_WIDTH×TABLE_HEIGHT logical canvas. */
export function createTableLayer(scale: number): HTMLCanvasElement {
  ensureSprites(scale)
  const [c, ctx] = makeCanvas(TABLE_WIDTH, TABLE_HEIGHT, scale)
  ctx.fillStyle = '#02040c'
  ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT)

  // --- cosmic playfield ---
  ctx.save()
  playfieldPath(ctx)
  ctx.clip()
  const bg = ctx.createRadialGradient(175, 200, 10, 175, 220, 300)
  bg.addColorStop(0, '#1f48b8')
  bg.addColorStop(0.45, '#0c2170')
  bg.addColorStop(1, '#030827')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT)
  const nebula = (x: number, y: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, color)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  nebula(80, 120, 110, 'rgba(150,60,230,0.28)')
  nebula(290, 300, 120, 'rgba(0,200,255,0.18)')
  nebula(220, 50, 90, 'rgba(255,80,200,0.14)')
  nebula(60, 360, 80, 'rgba(60,120,255,0.22)')
  // deck grid converging on the horizon
  ctx.strokeStyle = 'rgba(120,180,255,0.07)'
  ctx.lineWidth = 0.7
  for (let i = -8; i <= 8; i++) {
    ctx.beginPath()
    ctx.moveTo(175, 210)
    ctx.lineTo(175 + i * 40, 416)
    ctx.stroke()
  }
  for (let k = 1; k < 8; k++) {
    const y = 210 + (k * k * 206) / 64
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(375, y)
    ctx.stroke()
  }
  // stars
  const rnd = mulberry32(1995)
  for (let i = 0; i < 260; i++) {
    const x = rnd() * TABLE_WIDTH
    const y = rnd() * TABLE_HEIGHT
    const s = rnd()
    ctx.fillStyle = s > 0.92 ? '#fff6d8' : s > 0.6 ? 'rgba(220,235,255,0.85)' : 'rgba(180,200,255,0.5)'
    ctx.fillRect(x, y, s > 0.8 ? 1.3 : 0.7, s > 0.8 ? 1.3 : 0.7)
    if (s > 0.975) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.fillRect(x - 2.5, y + 0.4, 6, 0.5)
      ctx.fillRect(x + 0.4, y - 2.5, 0.5, 6)
    }
  }
  // Base planet with ring
  const pg = ctx.createRadialGradient(165, 205, 4, 175, 218, 40)
  pg.addColorStop(0, '#7fb0ff')
  pg.addColorStop(0.35, '#2f6bff')
  pg.addColorStop(1, '#071a66')
  ctx.fillStyle = pg
  ctx.beginPath()
  ctx.arc(175, 218, 36, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(190,220,255,0.5)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(175, 220, 56, 12, -0.25, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.arc(175, 218, 30, Math.PI * 1.1, Math.PI * 1.45)
  ctx.stroke()
  // plunger lane channel
  const lane = ctx.createLinearGradient(LANE_WALL, 0, RIGHT_WALL, 0)
  lane.addColorStop(0, '#060a1c')
  lane.addColorStop(0.5, '#14204a')
  lane.addColorStop(1, '#060a1c')
  ctx.fillStyle = lane
  ctx.fillRect(LANE_WALL, LANE_WALL_TOP, RIGHT_WALL - LANE_WALL, TABLE_HEIGHT - LANE_WALL_TOP)
  label(ctx, STRINGS.plungerDecal, PLUNGER.x, 270, 6.5, '#ffd24a', -Math.PI / 2)
  // out-lanes and in-lanes floor tint
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(LEFT_WALL, 290, 28, 126)
  ctx.fillRect(310, 290, 28, 126)
  // orbit channels
  ctx.fillStyle = 'rgba(0,10,40,0.35)'
  ctx.fillRect(LEFT_WALL, 120, 28, 140)
  ctx.fillRect(312, 120, 26, 140)
  ctx.restore()

  // --- labelled inserts ---
  for (const [x, y] of REENTRY_LIGHTS) lamp(ctx, x, y, 4, C.yellow, 'arrow')
  label(ctx, TABLE_LABELS.reentry, 230, 46, 6, '#ffe58a')
  lamp(ctx, BONUS_LIGHT[0], BONUS_LIGHT[1], 3.5, C.cyan, 'arrow')
  label(ctx, TABLE_LABELS.bonus, BONUS_LIGHT[0], BONUS_LIGHT[1] + 9, 5, '#bff6ff')
  for (const [x, y] of SPOT_LIGHTS) lamp(ctx, x, y, 3.5, C.cyan)
  label(ctx, TABLE_LABELS.mission, 68, 189, 6, '#bff6ff', -Math.PI / 2)
  lamp(ctx, EXTRA_BALL[0], EXTRA_BALL[1], 4, C.red, 'diamond')
  label(ctx, TABLE_LABELS.extraBall, EXTRA_BALL[0] + 2, EXTRA_BALL[1] + 10, 4.5, '#ffb0b0')
  for (const [x, y] of CHUTE_LIGHTS) lamp(ctx, x, y, 3.5, C.green, 'arrow')
  label(ctx, TABLE_LABELS.hyperspace, 26, 262, 5.5, '#b8ffc2', -Math.PI / 2)
  LEFT_HAZARD_LIGHTS.forEach(([x, y]) => lamp(ctx, x, y, 3.2, C.orange, 'arrow', Math.PI / 4))
  label(ctx, TABLE_LABELS.hazard, 64, 246, 5, '#ffc890')
  for (const [x, y] of RIGHT_HAZARD_LIGHTS) lamp(ctx, x, y, 3.2, C.orange, 'arrow', Math.PI / 2)
  label(ctx, TABLE_LABELS.hazard, 288, 189, 5, '#ffc890', -Math.PI / 2)
  for (const [x, y] of FUEL_LIGHTS) lamp(ctx, x, y, 3.5, C.fuel)
  label(ctx, TABLE_LABELS.fuel, 325, 181, 5.5, '#b0ffd8')
  for (const [x, y] of FLAG_LEVEL_LIGHTS) lamp(ctx, x, y, 2.6, C.magenta)
  label(ctx, TABLE_LABELS.flags, 325, 226, 5, '#ffc0f2')
  for (const [x, y] of ENGINE_LIGHTS) lamp(ctx, x, y, 3.2, C.orange)
  for (const [x, y] of ENGINE_LEVEL_LIGHTS) lamp(ctx, x, y, 2, C.orange)
  label(ctx, TABLE_LABELS.engine, 171, 191, 5, '#ffd0a0')
  for (const [x, y] of BUMPER_LEVEL_LIGHTS) lamp(ctx, x, y, 2.8, C.violet)
  label(ctx, TABLE_LABELS.attack, 201, 150, 5, '#e0c0ff')
  label(ctx, TABLE_LABELS.satellite, CIRCLES[3].x, CIRCLES[3].y - CIRCLES[3].radius - 5, 5, '#d8e6ff')
  MULTIPLIER_LIGHTS.forEach(([x, y], i) => {
    lamp(ctx, x, y, 4.5, C.yellow)
    label(ctx, TABLE_LABELS.multipliers[i], x, y + 0.5, 4.5, '#1a1200')
  })
  label(ctx, TABLE_LABELS.booster, 171, 262, 5.5, '#ffe58a')
  lamp(ctx, PLAYFIELD_CENTRE, 296, 6, '#ffffff', 'diamond')
  label(ctx, TABLE_LABELS.spaceWarp, PLAYFIELD_CENTRE, 309, 5, '#ffffff')
  for (const [x, y] of RANK_LIGHTS) lamp(ctx, x, y, 3, C.gold, 'diamond')
  label(ctx, TABLE_LABELS.rank, PLAYFIELD_CENTRE, 353, 5, '#ffe9a0')
  label(ctx, TABLE_LABELS.shootAgain, PLAYFIELD_CENTRE, 369, 4.5, '#ffb0b0')
  lamp(ctx, SHOOT_AGAIN[0], SHOOT_AGAIN[1], 4.5, C.red)
  lamp(ctx, RAMP_LIGHT[0], RAMP_LIGHT[1], 4, C.cyan, 'arrow')

  // --- kickers ---
  for (const s of SENSORS) {
    if (s.kind !== 'kicker') continue
    if (s.event === EventType.Wormhole) {
      hole(ctx, s.x, s.y, s.radius, WORMHOLE_COLORS[s.index])
      label(ctx, TABLE_LABELS.wormhole, s.x, s.index === 1 ? s.y - 14 : s.y + 14, 4.5, WORMHOLE_COLORS[s.index])
    } else if (s.event === EventType.BlackHole) {
      const g = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, 20)
      g.addColorStop(0, 'rgba(160,60,255,0.5)')
      g.addColorStop(1, 'rgba(60,0,120,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(s.x, s.y, 20, 0, Math.PI * 2)
      ctx.fill()
      hole(ctx, s.x, s.y, s.radius + 1, C.violet)
      label(ctx, TABLE_LABELS.blackHole, s.x + 16, s.y - 12, 4.5, '#e0c0ff')
      // RUG LORD apron frame (portrait drawn dynamically)
      ctx.fillStyle = '#1a0a30'
      ctx.beginPath()
      ctx.arc(RUG_APRON.x, RUG_APRON.y, RUG_APRON.r + 1.5, 0, Math.PI * 2)
      ctx.fill()
    } else {
      hole(ctx, s.x, s.y, s.radius, C.green)
    }
  }

  // --- slingshot plastics ---
  for (const sl of SLINGS) {
    ctx.beginPath()
    ctx.moveTo(sl.a[0], sl.a[1])
    ctx.lineTo(sl.b[0], sl.b[1])
    ctx.lineTo(sl.c[0], sl.c[1])
    ctx.closePath()
    const g = ctx.createLinearGradient(sl.a[0], sl.a[1], sl.c[0], sl.c[1])
    g.addColorStop(0, 'rgba(60,140,255,0.85)')
    g.addColorStop(1, 'rgba(20,50,170,0.85)')
    ctx.fillStyle = g
    ctx.fill()
    ctx.strokeStyle = '#f2f4ff'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = '#ffd24a'
    ctx.beginPath()
    ctx.arc((sl.a[0] + sl.b[0] + sl.c[0]) / 3, (sl.a[1] + sl.b[1] + sl.c[1]) / 3, 2.2, 0, Math.PI * 2)
    ctx.fill()
  }

  // --- spot target bodies (lights are dynamic) ---
  for (const s of SEGMENTS) {
    if (s.event < 0 || s.kind) continue
    if (s.event === EventType.Rebound) continue
    ctx.lineCap = 'butt'
    ctx.strokeStyle = '#0a0c18'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(s.ax, s.ay)
    ctx.lineTo(s.bx, s.by)
    ctx.stroke()
    ctx.strokeStyle = s.event === EventType.Engine ? '#ff9a3a' : s.event === EventType.Spot ? '#3ad8ff' : '#ff7a1a'
    ctx.lineWidth = 3
    ctx.stroke()
  }

  // --- satellite and lane posts ---
  for (const k of CIRCLES) {
    if (k.event === EventType.Satellite) {
      const g = ctx.createRadialGradient(k.x - 3, k.y - 4, 1, k.x, k.y, k.radius)
      g.addColorStop(0, '#ffffff')
      g.addColorStop(0.5, '#9fb2d8')
      g.addColorStop(1, '#2a3558')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(k.x, k.y, k.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#1a2240'
      ctx.lineWidth = 1.2
      for (let a = 0; a < 3; a++) {
        ctx.beginPath()
        ctx.arc(k.x, k.y, k.radius * (0.35 + a * 0.22), Math.PI * 1.1, Math.PI * 1.9)
        ctx.stroke()
      }
    } else if (k.event < 0 && k.layer === 0 && !k.kind) {
      chrome(ctx, () => {
        ctx.beginPath()
        ctx.arc(k.x, k.y, k.radius, 0, Math.PI * 2)
      }, 2)
    }
  }

  // --- apron ---
  const apron = (pts: number[]) => {
    ctx.beginPath()
    ctx.moveTo(pts[0], pts[1])
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
    ctx.closePath()
    const g = ctx.createLinearGradient(0, 380, 0, 416)
    g.addColorStop(0, '#3a4670')
    g.addColorStop(1, '#141a32')
    ctx.fillStyle = g
    ctx.fill()
  }
  apron([LEFT_WALL, 384, 40, 400, 108, 416, LEFT_WALL, 416])
  apron([LANE_WALL, 384, 310, 400, 242, 416, LANE_WALL, 416])
  label(ctx, TABLE_LABELS.apron, 52, 410, 5.5, '#cfe0ff')
  label(ctx, TABLE_LABELS.apronSub, 298, 410, 4, '#9fb4e8')

  // --- chrome rails ---
  chrome(ctx, () => {
    ctx.beginPath()
    for (const s of SEGMENTS) {
      if (s.event >= 0 || s.kind || s.layer === 1) continue
      ctx.moveTo(s.ax, s.ay)
      ctx.lineTo(s.bx, s.by)
    }
    for (const a of ARCS) {
      if (a.layer === 1) continue
      ctx.moveTo(a.x + Math.cos(a.start) * a.radius, a.y + Math.sin(a.start) * a.radius)
      ctx.arc(a.x, a.y, a.radius, a.start, a.end)
    }
  })
  // cabinet wood/metal rim outside the playfield
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, TABLE_WIDTH, TABLE_HEIGHT)
  playfieldPath(ctx, false)
  ctx.clip('evenodd')
  const rim = ctx.createLinearGradient(0, 0, TABLE_WIDTH, 0)
  rim.addColorStop(0, '#1a2140')
  rim.addColorStop(0.5, '#4a5888')
  rim.addColorStop(1, '#1a2140')
  ctx.fillStyle = rim
  ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT)
  ctx.restore()
  chrome(ctx, () => playfieldPath(ctx), 3)
  return c
}

const RUG_APRON = { x: 212, y: 212, r: 7 } as const
const BUMPERS = CIRCLES.filter((k) => k.event === EventType.Bumper)
const DROPS = SEGMENTS.filter((s) => s.kind === 'drop')
const GATES = SEGMENTS.filter((s) => s.kind === 'gate')
const SPINNER = SENSORS.find((s) => s.event === EventType.Spinner) ?? SENSORS[0]
const WORMHOLES = SENSORS.filter((s) => s.event === EventType.Wormhole)
const POST = CIRCLES.find((k) => k.kind === 'post') ?? CIRCLES[0]

function isLit(v: Lights, i: number): boolean {
  return typeof v === 'number' ? ((v >> i) & 1) === 1 : Boolean(v[i])
}

function glowAt(ctx: CanvasRenderingContext2D, sp: Sprites, color: string, x: number, y: number, size: number, alpha = 1) {
  ctx.globalAlpha = alpha
  ctx.drawImage(sp.glow[color], x - size, y - size, size * 2, size * 2)
  ctx.globalAlpha = 1
}

function lampGroup(ctx: CanvasRenderingContext2D, sp: Sprites, pts: readonly (readonly [number, number])[], v: Lights, color: string) {
  for (let i = 0; i < pts.length; i++) if (isLit(v, i)) glowAt(ctx, sp, color, pts[i][0], pts[i][1], 8)
}

function countGroup(ctx: CanvasRenderingContext2D, sp: Sprites, pts: readonly (readonly [number, number])[], n: number, color: string, size = 7) {
  for (let i = 0; i < pts.length && i < n; i++) glowAt(ctx, sp, color, pts[i][0], pts[i][1], size)
}

function portrait(ctx: CanvasRenderingContext2D, img: HTMLImageElement | undefined, x: number, y: number, r: number, frame: string) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.clip()
  if (img && img.complete && img.naturalWidth > 0) ctx.drawImage(img, x - r, y - r, r * 2, r * 2)
  else {
    ctx.fillStyle = frame
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.beginPath()
    ctx.arc(x, y - r * 0.15, r * 0.42, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(x - r * 0.7, y + r * 0.35, r * 1.4, r)
  }
  ctx.restore()
}

/**
 * Draw one frame. ctx must be transformed so 1 unit = 1 logical table pixel. `layer` is from createTableLayer.
 * No allocations per call.
 */
export function drawTable(ctx: CanvasRenderingContext2D, layer: HTMLCanvasElement, p: PhysicsView, game: GameView, art?: TableArt) {
  const sp = sprites
  ctx.drawImage(layer, 0, 0, TABLE_WIDTH, TABLE_HEIGHT)
  if (!sp) return
  const t = p.time
  const pulse = 0.55 + 0.45 * Math.sin(t * 8)
  const hit = p.hitTime
  const rank = game.player ? game.player.rank : (game.rank ?? 0)

  // --- inserts ---
  lampGroup(ctx, sp, REENTRY_LIGHTS, game.reentryLights, C.yellow)
  lampGroup(ctx, sp, SPOT_LIGHTS, game.spotTargets, C.cyan)
  lampGroup(ctx, sp, LEFT_HAZARD_LIGHTS, game.leftHazards, C.orange)
  lampGroup(ctx, sp, RIGHT_HAZARD_LIGHTS, game.rightHazards, C.orange)
  lampGroup(ctx, sp, ENGINE_LIGHTS, game.engineTargets, C.orange)
  countGroup(ctx, sp, ENGINE_LEVEL_LIGHTS, game.engineLevel, C.orange, 5)
  countGroup(ctx, sp, BUMPER_LEVEL_LIGHTS, game.bumperLevel, C.violet, 6)
  countGroup(ctx, sp, FLAG_LEVEL_LIGHTS, game.flagLevel, C.magenta, 5)
  countGroup(ctx, sp, MULTIPLIER_LIGHTS, game.multiplier, C.yellow, 9)
  countGroup(ctx, sp, RANK_LIGHTS, rank + 1, C.gold, 6)
  countGroup(ctx, sp, CHUTE_LIGHTS, game.hyperspaceCount ?? 0, C.green)
  const fuelLights = Math.ceil(game.fuel / 25)
  if (game.fuel > 0 && game.fuel <= 20) glowAt(ctx, sp, C.fuel, FUEL_LIGHTS[0][0], FUEL_LIGHTS[0][1], 8, pulse)
  else countGroup(ctx, sp, FUEL_LIGHTS, fuelLights, C.fuel, 8)
  if (game.fuel > 0 && !game.mission) glowAt(ctx, sp, C.cyan, RAMP_LIGHT[0], RAMP_LIGHT[1], 9, pulse)
  else if (game.mission) glowAt(ctx, sp, C.cyan, RAMP_LIGHT[0], RAMP_LIGHT[1], 8)
  if (game.extraBallLit) glowAt(ctx, sp, C.red, EXTRA_BALL[0], EXTRA_BALL[1], 9, pulse)
  if (!game.ballSaveUsed && game.launchedAt >= 0 && game.time - game.launchedAt < BALL_SAVE_SECONDS) {
    glowAt(ctx, sp, C.red, SHOOT_AGAIN[0], SHOOT_AGAIN[1], 10, pulse)
  }
  const wc = game.wormholeColor
  if (wc >= 0 && wc < 3) {
    glowAt(ctx, sp, WORMHOLE_COLORS[wc], PLAYFIELD_CENTRE, 296, 11, pulse)
    glowAt(ctx, sp, WORMHOLE_COLORS[wc], WORMHOLES[wc].x, WORMHOLES[wc].y, 14, pulse * 0.8)
  }
  if (hit) {
    for (let i = 0; i < 3; i++) {
      const dt = t - hit[slotOf(EventType.Reentry, i)]
      if (dt < 0.2) glowAt(ctx, sp, '#ffffff', REENTRY_LIGHTS[i][0], REENTRY_LIGHTS[i][1], 10, 1 - dt * 5)
    }
    const bh = t - hit[slotOf(EventType.BlackHole)]
    if (bh < 0.6) glowAt(ctx, sp, C.violet, 232, 196, 22, 1 - bh / 0.6)
    const hy = t - hit[slotOf(EventType.Hyperspace)]
    if (hy < 0.6) glowAt(ctx, sp, C.green, 26, 136, 20, 1 - hy / 0.6)
    const ws = t - hit[slotOf(EventType.Warp)]
    if (ws < 0.3) glowAt(ctx, sp, '#ffffff', PLAYFIELD_CENTRE, 296, 14, 1 - ws / 0.3)
    for (let i = 0; i < 2; i++) {
      const dt = t - hit[slotOf(EventType.Rebound, i)]
      if (dt < 0.12) {
        const sl = SLINGS[i]
        glowAt(ctx, sp, '#ffffff', (sl.a[0] + sl.c[0]) / 2, (sl.a[1] + sl.c[1]) / 2, 16, 1 - dt / 0.12)
      }
    }
  }

  // RUG LORD on the black hole apron
  portrait(ctx, art?.rugLord, RUG_APRON.x, RUG_APRON.y, RUG_APRON.r, '#5a2a8a')

  // --- drop targets ---
  for (let i = 0; i < DROPS.length; i++) {
    const d = DROPS[i]
    ctx.lineCap = 'butt'
    if ((p.dropTargets >> d.index) & 1) {
      ctx.strokeStyle = '#05060c'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(d.ax, d.ay)
      ctx.lineTo(d.bx, d.by)
      ctx.stroke()
    } else {
      ctx.fillStyle = 'rgba(0,0,10,0.5)'
      ctx.fillRect(d.ax + 1.5, d.ay - 3, d.bx - d.ax, 7)
      ctx.fillStyle = '#c21f34'
      ctx.fillRect(d.ax, d.ay - 5, d.bx - d.ax, 7)
      ctx.fillStyle = '#ff8a96'
      ctx.fillRect(d.ax, d.ay - 5, d.bx - d.ax, 1.6)
      ctx.fillStyle = '#ffd24a'
      ctx.fillRect(d.ax + (d.bx - d.ax) / 2 - 1.5, d.ay - 2.8, 3, 3)
    }
  }

  // --- gates and centre post ---
  const gates = p.gates
  for (let i = 0; i < GATES.length; i++) {
    const g = GATES[i]
    if (!((gates >> g.index) & 1)) continue
    ctx.strokeStyle = C.yellow
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(g.ax, g.ay)
    ctx.lineTo(g.bx, g.by)
    ctx.stroke()
    glowAt(ctx, sp, C.yellow, (g.ax + g.bx) / 2, g.ay, 12, pulse * 0.6)
  }
  if (p.postRaised) {
    glowAt(ctx, sp, C.cyan, POST.x, POST.y, 10, pulse)
    ctx.fillStyle = '#e8eefc'
    ctx.beginPath()
    ctx.arc(POST.x, POST.y, POST.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#5a6688'
    ctx.beginPath()
    ctx.arc(POST.x + 1, POST.y + 1, POST.radius * 0.55, 0, Math.PI * 2)
    ctx.fill()
  }

  // --- spinner flag ---
  const sa = p.spinnerAngle
  const half = 10 * Math.cos(sa)
  ctx.fillStyle = Math.sin(sa) >= 0 ? '#e8eefc' : '#7f8db4'
  ctx.fillRect(SPINNER.x - 12, SPINNER.y - Math.abs(half) / 2, 24, Math.max(1, Math.abs(half)))
  ctx.strokeStyle = '#c8d2ea'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(SPINNER.x - 13, SPINNER.y)
  ctx.lineTo(SPINNER.x + 13, SPINNER.y)
  ctx.stroke()

  // --- attack bumpers with Cabald caps ---
  const menace = game.mission !== null && game.mission.id === 'menace'
  for (let i = 0; i < BUMPERS.length; i++) {
    const b = BUMPERS[i]
    const dt = t - hit[slotOf(EventType.Bumper, b.index)]
    const lit = dt < 0.12
    ctx.drawImage(lit ? sp.bumperLit : sp.bumper, b.x - 18, b.y - 18, 36, 36)
    portrait(ctx, art?.bumpers[b.index], b.x, b.y, 8.5, '#3c2a6a')
    if (menace) {
      glowAt(ctx, sp, C.violet, b.x, b.y, 22, pulse * 0.8)
      ctx.strokeStyle = C.violet
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.arc(b.x, b.y, 10.5, 0.5, Math.PI * 2 - 0.5)
      ctx.stroke()
    }
    if (lit) glowAt(ctx, sp, '#ffffff', b.x, b.y, 22, 1 - dt / 0.12)
  }
  const sat = CIRCLES[3]
  if (hit) {
    const ds = t - hit[slotOf(EventType.Satellite)]
    if (ds < 0.15) glowAt(ctx, sp, C.cyan, sat.x, sat.y, 20, 1 - ds / 0.15)
  }

  // --- plunger ---
  const pull = p.plunger * VISIBLE_PLUNGER_TRAVEL
  const py = PLUNGER.top + pull
  ctx.strokeStyle = '#9aa8c8'
  ctx.lineWidth = 1
  ctx.beginPath()
  const coils = 6
  const springTop = py + 4
  const span = TABLE_HEIGHT - springTop
  for (let i = 0; i <= coils * 2; i++) {
    const y = springTop + (span * i) / (coils * 2)
    const x = PLUNGER.x + (i % 2 === 0 ? -4 : 4)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.fillStyle = '#c8d2ea'
  ctx.fillRect(PLUNGER.x - 1.5, py, 3, TABLE_HEIGHT - py)
  ctx.fillStyle = '#d42032'
  ctx.fillRect(PLUNGER.x - PLUNGER.width / 2, py, PLUNGER.width, 4)
  ctx.fillStyle = '#ff8a96'
  ctx.fillRect(PLUNGER.x - PLUNGER.width / 2, py, PLUNGER.width, 1)
  // Five amber inserts rise with real pull strength, even though the visible knob travel is capped.
  const strengthSegments = Math.ceil(p.plunger * PLUNGER_METER_SEGMENTS)
  for (let i = 0; i < PLUNGER_METER_SEGMENTS; i++) {
    ctx.fillStyle = i < strengthSegments ? C.gold : '#3a2a08'
    ctx.fillRect(PLUNGER_METER_X, PLUNGER_METER_BOTTOM - i * 10 - 8, 4, 8)
  }

  // --- ball (under the ramp unless riding it) ---
  const ball = p.ball
  const onRamp = ball.layer === 1
  if (ball.active && !onRamp) drawBall(ctx, sp, ball.x, ball.y, ball.radius, ball.height)
  else if (!ball.active && game.phase === 'ready') drawBall(ctx, sp, LAUNCH.x, LAUNCH.y + pull, BALL_RADIUS, 0)
  ctx.drawImage(sp.ramp, 0, 0, TABLE_WIDTH, TABLE_HEIGHT)
  if (hit) {
    const dr = t - hit[slotOf(EventType.Ramp)]
    if (dr < 0.4) glowAt(ctx, sp, C.cyan, RAMP.turn.x, RAMP.turn.y - 20, 24, 1 - dr / 0.4)
  }

  // --- flippers ---
  drawFlipper(ctx, sp.flipperL, FLIPPERS[0].x, FLIPPERS[0].y, p.visualLeftAngle)
  drawFlipper(ctx, sp.flipperR, FLIPPERS[1].x, FLIPPERS[1].y, p.visualRightAngle)

  if (ball.active && onRamp) drawBall(ctx, sp, ball.x, ball.y, ball.radius, ball.height)

  if (p.tilted || game.tilted) {
    ctx.font = TILT_FONT
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.globalAlpha = pulse
    ctx.lineJoin = 'round'
    ctx.lineWidth = 4
    ctx.strokeStyle = 'rgba(0,0,12,0.6)'
    ctx.strokeText(TABLE_LABELS.tilt, PLAYFIELD_CENTRE + 2, 232)
    ctx.lineWidth = 2
    ctx.strokeStyle = '#ffffff'
    ctx.strokeText(TABLE_LABELS.tilt, PLAYFIELD_CENTRE, 230)
    ctx.fillStyle = '#ff2a2a'
    ctx.fillText(TABLE_LABELS.tilt, PLAYFIELD_CENTRE, 230)
    ctx.globalAlpha = 1
  }
}

const TILT_FONT = `bold 28px ${FONT}`
function drawFlipper(ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, angle: number) {
  const f = FLIPPERS[0]
  const o = FLIP_PAD + f.radius
  ctx.save()
  ctx.translate(x + 1.5, y + 2.5)
  ctx.rotate(angle)
  ctx.globalAlpha = 0.35
  ctx.globalCompositeOperation = 'multiply'
  ctx.drawImage(img, -o, -o, img.width / (sprites?.scale ?? 1), img.height / (sprites?.scale ?? 1))
  ctx.restore()
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.drawImage(img, -o, -o, img.width / (sprites?.scale ?? 1), img.height / (sprites?.scale ?? 1))
  ctx.restore()
}

function drawBall(ctx: CanvasRenderingContext2D, sp: Sprites, x: number, y: number, radius: number, height: number) {
  const h = height < 0 ? 0 : height > 1 ? 1 : height
  const k = (1 + h * 0.25) * (radius / BALL_RADIUS)
  // offset shadow: farther and softer as the ball rises
  ctx.fillStyle = 'rgba(0,0,12,0.42)'
  ctx.beginPath()
  ctx.ellipse(x + 2 + h * 6, y + 3 + h * 8, radius * (1 + h * 0.3), radius * (0.8 + h * 0.2), 0, 0, Math.PI * 2)
  ctx.fill()
  const s = 20 * k
  ctx.drawImage(sp.ball, x - s / 2, y - s / 2, s, s)
}
