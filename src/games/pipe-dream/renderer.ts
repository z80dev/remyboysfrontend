import { drawBevel } from '../kit'
import { COLS, ROWS, CONNECTIONS, VALVE_OUTLETS } from './engine'
import type { Direction, Piece, PipeGame } from './engine'
import { strings } from './strings'

const SIZE = 48
const POINTS = 64
const EDGE_X = [24, 48, 24, 0]
const EDGE_Y = [0, 24, 48, 24]
const HIGHLIGHT_DASH = [5, 19]
const PORTAL_DASH = [3, 3]
const SOLID_DASH: number[] = []
const paths: Float32Array[][] = []
for (let entry = 0; entry < 4; entry++) {
  paths[entry] = []
  for (let exit = 0; exit < 4; exit++) {
    const data = new Float32Array((POINTS + 1) * 2)
    const straight = (entry + 2) % 4 === exit || entry === exit
    const cx = entry === 1 || exit === 1 ? 48 : 0
    const cy = entry === 2 || exit === 2 ? 48 : 0
    const startAngle = Math.atan2(EDGE_Y[entry] - cy, EDGE_X[entry] - cx)
    let delta = Math.atan2(EDGE_Y[exit] - cy, EDGE_X[exit] - cx) - startAngle
    if (delta > Math.PI) delta -= Math.PI * 2
    if (delta < -Math.PI) delta += Math.PI * 2
    for (let i = 0; i <= POINTS; i++) {
      const t = i / POINTS
      data[i * 2] = straight ? EDGE_X[entry] + ((entry === exit ? 24 : EDGE_X[exit]) - EDGE_X[entry]) * t : cx + Math.cos(startAngle + delta * t) * 24
      data[i * 2 + 1] = straight ? EDGE_Y[entry] + ((entry === exit ? 24 : EDGE_Y[exit]) - EDGE_Y[entry]) * t : cy + Math.sin(startAngle + delta * t) * 24
    }
    paths[entry][exit] = data
  }
}
const spouts = paths.map((directions, direction) => {
  const path = directions[direction]
  const data = new Float32Array(path.length)
  for (let i = 0; i <= POINTS; i++) {
    data[i * 2] = path[(POINTS - i) * 2]
    data[i * 2 + 1] = path[(POINTS - i) * 2 + 1]
  }
  return data
})
const SHARDS = Array.from({ length: 18 }, (_, index) => {
  const angle = index * Math.PI / 9
  const speed = 150 + index % 4 * 24
  return {
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 90,
    size: 4 + index % 3, spin: (index % 2 ? 1 : -1) * (12 + index % 5 * 3),
    angle, flange: index % 3 === 0, color: index % 2 ? '#e0e6ec' : '#4a525a'
  }
})
function trace(ctx: CanvasRenderingContext2D, entry: Direction, exit: Direction, progress = 1, spout = false) {
  const path = spout ? spouts[exit] : paths[entry][exit]
  const end = Math.max(0, Math.min(POINTS, progress * POINTS))
  const whole = Math.floor(end)
  ctx.beginPath()
  ctx.moveTo(path[0], path[1])
  for (let i = 1; i <= whole; i++) ctx.lineTo(path[i * 2], path[i * 2 + 1])
  if (whole < POINTS) ctx.lineTo(path[whole * 2] + (path[whole * 2 + 2] - path[whole * 2]) * (end - whole), path[whole * 2 + 1] + (path[whole * 2 + 3] - path[whole * 2 + 1]) * (end - whole))
}
function steel(ctx: CanvasRenderingContext2D, entry: Direction, exit: Direction, spout = false) {
  ctx.lineCap = 'butt'
  trace(ctx, entry, exit, 1, spout)
  ctx.strokeStyle = '#343e48'
  ctx.lineWidth = 20
  ctx.stroke()
  ctx.strokeStyle = '#9aa4ae'
  ctx.lineWidth = 16
  ctx.stroke()
  ctx.save()
  ctx.translate(-2, -2)
  trace(ctx, entry, exit, 1, spout)
  ctx.strokeStyle = '#e0e6ec'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.restore()
}
function drawVault(ctx: CanvasRenderingContext2D) {
  drawBevel(ctx, 8, 6, 32, 36, { width: 2, face: false })
  ctx.fillStyle = '#39434e'
  ctx.fillRect(10, 8, 28, 32)
  ctx.fillStyle = '#83909d'
  ctx.fillRect(13, 10, 22, 28)
  ctx.strokeStyle = '#e0e6ec'
  ctx.lineWidth = 1
  ctx.strokeRect(13.5, 10.5, 21, 27)
  ctx.fillStyle = '#343e48'
  ctx.fillRect(10, 13, 5, 7)
  ctx.fillRect(10, 29, 5, 7)
  ctx.fillStyle = '#d7e0e8'
  ctx.fillRect(11, 13, 2, 6)
  ctx.fillRect(11, 29, 2, 6)
  ctx.beginPath()
  ctx.arc(23, 22, 7, 0, Math.PI * 2)
  ctx.fillStyle = '#29343e'
  ctx.fill()
  ctx.strokeStyle = '#e0e6ec'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#bbc5cf'
  ctx.fillRect(21, 20, 4, 4)
  ctx.fillStyle = '#ffcc33'
  ctx.fillRect(22, 16, 2, 4)
  ctx.fillStyle = '#29343e'
  ctx.fillRect(29, 25, 7, 11)
  ctx.fillStyle = '#e0e6ec'
  ctx.fillRect(31, 26, 3, 8)
  ctx.fillRect(29, 26, 6, 2)
  ctx.fillRect(29, 32, 6, 2)
}
function drawValve(ctx: CanvasRenderingContext2D, piece: Piece) {
  const direction = VALVE_OUTLETS[piece]
  ctx.save()
  ctx.translate(24, 24)
  ctx.rotate(direction * Math.PI / 2)
  ctx.fillStyle = '#29343e'
  ctx.strokeStyle = '#e0e6ec'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, -11)
  ctx.lineTo(-7, 1)
  ctx.lineTo(7, 1)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#ffcc33'
  ctx.fillRect(-6, 7, 12, 9)
  ctx.strokeStyle = '#29343e'
  ctx.lineWidth = 2
  ctx.strokeRect(-6, 7, 12, 9)
  ctx.beginPath()
  ctx.arc(0, 7, 4, Math.PI, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#29343e'
  ctx.fillRect(-1, 10, 2, 4)
  ctx.restore()
}
/** A shared static tile painter for the board and dispenser previews. */
export function drawPiece(ctx: CanvasRenderingContext2D, piece: Piece, grid = false, outlet: Direction = 1) {
  ctx.fillStyle = '#708090'
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.fillStyle = '#a0b0c0'
  ctx.fillRect(0, 0, SIZE, 1)
  ctx.fillRect(0, 0, 1, SIZE)
  ctx.fillStyle = '#404a56'
  ctx.fillRect(0, SIZE - 1, SIZE, 1)
  ctx.fillRect(SIZE - 1, 0, 1, SIZE)
  ctx.fillStyle = '#788898'
  for (let y = 5; y < SIZE; y += 12) {
    ctx.fillRect(5, y, 2, 2)
    ctx.fillRect(35, y + 4, 2, 2)
  }
  if (grid) {
    ctx.strokeStyle = '#263442'
    ctx.lineWidth = 1
    ctx.strokeRect(.5, .5, SIZE - 1, SIZE - 1)
  }
  if (piece === 'empty') return
  if (piece === 'block') {
    ctx.globalAlpha = .9
    ctx.fillStyle = '#382451'
    ctx.fillRect(8, 6, 34, 36)
    ctx.fillStyle = '#6a3d9a'
    ctx.fillRect(5, 5, 38, 8)
    ctx.fillRect(17, 13, 14, 23)
    ctx.fillRect(5, 35, 38, 8)
    ctx.fillStyle = '#c5a5df'
    ctx.fillRect(8, 8, 2, 2)
    ctx.fillRect(38, 38, 2, 2)
    ctx.fillStyle = '#ffcc33'
    ctx.font = 'bold 24px Georgia, serif'
    ctx.fillText(strings.bridge, 16, 32)
    ctx.globalAlpha = 1
    return
  }
  if (piece === 'source') {
    steel(ctx, outlet, outlet, true)
    drawVault(ctx)
    return
  }
  if (piece === 'drain') {
    for (let i = 0; i < 4; i++) steel(ctx, i as Direction, i as Direction)
    ctx.fillStyle = '#444e58'
    ctx.beginPath()
    ctx.arc(24, 24, 18, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#cbd4df'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = '#8394a5'
    ctx.beginPath()
    ctx.arc(24, 24, 13, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  const ports = CONNECTIONS[piece]
  if (piece === 'cross') {
    steel(ctx, 3, 1)
    steel(ctx, 0, 2)
    ctx.strokeStyle = '#dde4ec'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(24, 24, 10, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#444e58'
    ctx.fillRect(13, 13, 2, 2)
    ctx.fillRect(33, 33, 2, 2)
  } else steel(ctx, ports[0], ports[1])
  ctx.fillStyle = '#bbc5cf'
  for (const port of ports) {
    if (port % 2 === 0) ctx.fillRect(13, port === 0 ? 2 : 44, 22, 2)
    else ctx.fillRect(port === 1 ? 44 : 2, 13, 2, 22)
  }
  if (piece.startsWith('reservoir')) {
    ctx.fillStyle = '#424e5b'
    ctx.fillRect(10, 8, 28, 32)
    ctx.fillStyle = '#b1c4ce'
    ctx.fillRect(13, 11, 22, 26)
    ctx.strokeStyle = '#e0e6ec'
    ctx.lineWidth = 2
    ctx.strokeRect(10, 8, 28, 32)
  }
  if (piece.startsWith('valve')) drawValve(ctx, piece)
}
function gold(ctx: CanvasRenderingContext2D, entry: Direction, exit: Direction, progress: number, clock: number, front: boolean, spout = false) {
  trace(ctx, entry, exit, progress, spout)
  ctx.lineWidth = 11
  ctx.lineCap = 'butt'
  ctx.strokeStyle = '#cf8d00'
  ctx.stroke()
  ctx.lineWidth = 7
  ctx.strokeStyle = '#ffcc33'
  ctx.stroke()
  ctx.lineWidth = 2
  ctx.strokeStyle = '#fff2b0'
  ctx.setLineDash(HIGHLIGHT_DASH)
  ctx.lineDashOffset = -clock * .04
  ctx.stroke()
  ctx.setLineDash(SOLID_DASH)
  if (front) {
    const data = spout ? spouts[exit] : paths[entry][exit]
    const at = Math.min(POINTS - 1, Math.floor(progress * POINTS))
    const fraction = progress * POINTS - at
    const x = data[at * 2] + (data[at * 2 + 2] - data[at * 2]) * fraction
    const y = data[at * 2 + 1] + (data[at * 2 + 3] - data[at * 2 + 1]) * fraction
    ctx.fillStyle = '#ffcc33'
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#fff2b0'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(x, y, 4, Math.PI, Math.PI * 1.8)
    ctx.stroke()
  }
}
export class BoardRenderer {
  private layer = document.createElement('canvas')
  private context: CanvasRenderingContext2D | null
  private board: Piece[] | null = null
  private grid = false
  private scale = 0
  private outlet: Direction = 1
  constructor() {
    this.layer.width = COLS * SIZE
    this.layer.height = ROWS * SIZE
    this.context = this.layer.getContext('2d')
  }
  draw(ctx: CanvasRenderingContext2D, game: PipeGame, time: number, cursor: number, grid: boolean, celebration = 0, scale = 1) {
    if (this.board !== game.board || this.grid !== grid || this.scale !== scale || this.outlet !== game.outlet) {
      if (this.scale !== scale) {
        this.layer.width = Math.round(COLS * SIZE * scale)
        this.layer.height = Math.round(ROWS * SIZE * scale)
        this.context?.setTransform(this.layer.width / (COLS * SIZE), 0, 0, this.layer.height / (ROWS * SIZE), 0, 0)
      }
      this.scale = scale
      this.outlet = game.outlet
      this.board = game.board
      this.grid = grid
      if (this.context) for (let index = 0; index < game.board.length; index++) {
        this.context.save()
        this.context.translate(index % COLS * SIZE, Math.floor(index / COLS) * SIZE)
        drawPiece(this.context, game.board[index], grid, game.outlet)
        if (game.bonus && index === game.gap) {
          drawBevel(this.context, 3, 3, 42, 42, { inset: true, width: 3, face: false })
          this.context.fillStyle = '#202b35'
          this.context.fillRect(6, 6, 36, 36)
          this.context.fillStyle = '#101820'
          this.context.fillRect(6, 6, 36, 3)
          this.context.fillRect(6, 6, 3, 36)
        }
        this.context.restore()
      }
    }
    ctx.drawImage(this.layer, 0, 0, COLS * SIZE, ROWS * SIZE)
    for (let index = 0; index < game.board.length; index++) {
      const piece = game.board[index]
      const filling = game.phase === 'flow' && game.head === index
      if (!game.filled[index] && !filling && !(celebration > 0 && game.placed[index])) continue
      ctx.save()
      ctx.translate(index % COLS * SIZE, Math.floor(index / COLS) * SIZE)
      if (piece === 'source') gold(ctx, game.outlet, game.outlet, 1, time, false, true)
      else if (piece === 'cross') {
        if (game.filled[index] & 1) gold(ctx, 3, 1, 1, time, false)
        if (game.filled[index] & 2) gold(ctx, 0, 2, 1, time, false)
      } else if (game.filled[index]) {
        const entry = piece === 'drain' ? game.entry : CONNECTIONS[piece][0]
        gold(ctx, entry, piece === 'drain' ? entry : CONNECTIONS[piece][1], 1, time, false)
      }
      const progress = filling ? Math.max(0, Math.min(1, (time - game.started) / game.duration)) : game.filled[index] ? 1 : 0
      if (filling) gold(ctx, game.entry, game.exit, progress, time, true)
      if (piece.startsWith('reservoir')) {
        ctx.fillStyle = '#b1c4ce'
        ctx.fillRect(13, 11, 22, 26)
        ctx.fillStyle = '#cf8d00'
        ctx.fillRect(13, 37 - 26 * progress, 22, 26 * progress)
        ctx.fillStyle = '#ffcc33'
        ctx.fillRect(15, 37 - 26 * progress, 18, 26 * progress)
        ctx.fillStyle = '#fff2b0'
        ctx.fillRect(15, 37 - 26 * progress, 18, 1)
      }
      if (piece === 'drain' && game.filled[index]) {
        ctx.fillStyle = '#ffcc33'
        ctx.beginPath()
        ctx.arc(24, 24, 12, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#fff2b0'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(24, 24, 4 + time % 700 / 100, 0, Math.PI * 2)
        ctx.stroke()
      }
      if (piece === 'source') drawVault(ctx)
      if (piece.startsWith('valve')) drawValve(ctx, piece)
      if (celebration > 0 && game.placed[index] && (Math.floor(celebration / 60) + index) % 7 === 0) {
        ctx.fillStyle = '#fff2b0'
        ctx.globalAlpha = .3
        ctx.fillRect(1, 1, 46, 46)
      }
      ctx.restore()
    }
    for (let i = 0; i < game.portals.length; i++) {
      const portal = game.portals[i]
      for (let side = 0; side < 2; side++) {
        const index = side === 0 ? portal.a : portal.b
        const direction = side === 0 ? portal.direction : (portal.direction + 2) % 4
        const x = index % COLS * SIZE + EDGE_X[direction]
        const y = Math.floor(index / COLS) * SIZE + EDGE_Y[direction]
        ctx.strokeStyle = '#62ffe4'
        ctx.lineWidth = 3
        ctx.setLineDash(PORTAL_DASH)
        ctx.beginPath()
        ctx.arc(x, y, 12, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash(SOLID_DASH)
        ctx.fillStyle = '#102e35'
        ctx.font = 'bold 10px monospace'
        ctx.fillText(strings.portalLabels[i], Math.max(3, Math.min(468, x - 3)), Math.max(12, Math.min(328, y + 3)))
      }
    }
    if (game.replacement) {
      const burst = game.replacement
      const elapsed = Math.max(0, time - (burst.until - 250))
      const progress = Math.min(1, elapsed / 250)
      const seconds = elapsed / 1000
      const cx = burst.index % COLS * SIZE + 24
      const cy = Math.floor(burst.index / COLS) * SIZE + 24
      ctx.save()
      ctx.translate(cx - 24, cy - 24)
      drawPiece(ctx, 'empty', grid)
      if (elapsed < 80) {
        ctx.save()
        if (elapsed < 34) ctx.translate(elapsed < 17 ? -2 : 2, elapsed < 17 ? 1 : -1)
        drawPiece(ctx, game.board[burst.index], grid)
        ctx.strokeStyle = '#202b35'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(15, 10)
        ctx.lineTo(26, 21)
        ctx.lineTo(20, 28)
        ctx.lineTo(34, 39)
        ctx.stroke()
        ctx.fillStyle = '#ffffff'
        ctx.globalAlpha = .75 * (1 - elapsed / 80)
        ctx.fillRect(6, 6, 36, 36)
        ctx.restore()
      }
      ctx.restore()
      if (elapsed < 160) {
        ctx.globalAlpha = .45 * (1 - elapsed / 160)
        ctx.fillStyle = '#d5d0c3'
        for (let i = 0; i < 8; i++) {
          const shard = SHARDS[i * 2]
          const size = 10 + Math.floor(progress * 20)
          ctx.fillRect(Math.round(cx + shard.vx * seconds * .3 - size / 2), Math.round(cy + shard.vy * seconds * .3 - size / 2), size, size)
        }
        ctx.globalAlpha = 1
      }
      for (const shard of SHARDS) {
        ctx.save()
        ctx.translate(Math.round(cx + shard.vx * seconds), Math.round(cy + shard.vy * seconds + 520 * seconds * seconds))
        ctx.rotate(shard.angle + shard.spin * seconds)
        ctx.globalAlpha = Math.min(1, (1 - progress) * 4)
        ctx.fillStyle = shard.color
        ctx.fillRect(-shard.size / 2, -shard.size / 2, shard.size, shard.size)
        ctx.fillStyle = '#a8b6c3'
        ctx.fillRect(-shard.size / 2, -shard.size / 2, shard.size, 1)
        if (shard.flange) {
          ctx.fillStyle = '#343e48'
          ctx.fillRect(-1, -1, 2, 2)
        }
        ctx.restore()
      }
    }
    ctx.strokeStyle = '#ffff00'
    ctx.lineWidth = 2
    ctx.strokeRect(cursor % COLS * SIZE + 3, Math.floor(cursor / COLS) * SIZE + 3, 42, 42)
  }
  dispose() {
    this.layer.width = 0
    this.layer.height = 0
    this.context = null
    this.board = null
  }
}
