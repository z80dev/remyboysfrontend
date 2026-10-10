import { drawBevel } from '../kit'
import { COLS, ROWS, CONNECTIONS, type Direction, type Piece, type PipeGame } from './engine'
import { strings } from './strings'

const SIZE = 48
const POINTS = 64
const EDGE_X = [24, 48, 24, 0]
const EDGE_Y = [0, 24, 48, 24]
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
function trace(ctx: CanvasRenderingContext2D, entry: Direction, exit: Direction, progress = 1) {
  const path = paths[entry][exit]
  const end = Math.max(0, Math.min(POINTS, progress * POINTS))
  const whole = Math.floor(end)
  ctx.beginPath()
  ctx.moveTo(path[0], path[1])
  for (let i = 1; i <= whole; i++) ctx.lineTo(path[i * 2], path[i * 2 + 1])
  if (whole < POINTS) ctx.lineTo(path[whole * 2] + (path[whole * 2 + 2] - path[whole * 2]) * (end - whole), path[whole * 2 + 1] + (path[whole * 2 + 3] - path[whole * 2 + 1]) * (end - whole))
}
function steel(ctx: CanvasRenderingContext2D, entry: Direction, exit: Direction) {
  ctx.lineCap = 'butt'
  trace(ctx, entry, exit)
  ctx.strokeStyle = '#343e48'
  ctx.lineWidth = 20
  ctx.stroke()
  ctx.strokeStyle = '#9aa4ae'
  ctx.lineWidth = 16
  ctx.stroke()
  ctx.save()
  ctx.translate(-2, -2)
  trace(ctx, entry, exit)
  ctx.strokeStyle = '#e0e6ec'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.restore()
}
/** A shared static tile painter for the board and dispenser previews. */
export function drawPiece(ctx: CanvasRenderingContext2D, piece: Piece, grid = false) {
  ctx.fillStyle = '#708090'
  ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.fillStyle = '#a0b0c0'
  ctx.fillRect(0, 0, SIZE, 1)
  ctx.fillRect(0, 0, 1, SIZE)
  ctx.fillStyle = '#404a56'
  ctx.fillRect(0, SIZE - 1, SIZE, 1)
  ctx.fillRect(SIZE - 1, 0, 1, SIZE)
  ctx.fillStyle = '#788898'
  for (let y = 5; y < SIZE; y += 12) { ctx.fillRect(5, y, 2, 2); ctx.fillRect(35, y + 4, 2, 2) }
  if (grid) { ctx.strokeStyle = '#263442'; ctx.lineWidth = 1; ctx.strokeRect(.5, .5, SIZE - 1, SIZE - 1) }
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
    steel(ctx, 3, 1)
    drawBevel(ctx, 5, 6, 33, 36, { width: 2, face: false })
    ctx.fillStyle = '#5a6470'
    ctx.fillRect(7, 8, 29, 32)
    ctx.strokeStyle = '#d7e0e8'
    ctx.lineWidth = 2
    ctx.strokeRect(11, 12, 19, 23)
    ctx.beginPath(); ctx.arc(20, 22, 5, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = '#d7e0e8'
    ctx.fillRect(29, 18, 3, 12)
    return
  }
  if (piece === 'drain') {
    for (let i = 0; i < 4; i++) steel(ctx, i as Direction, i as Direction)
    ctx.fillStyle = '#444e58'
    ctx.beginPath(); ctx.arc(24, 24, 18, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#cbd4df'; ctx.lineWidth = 3; ctx.stroke()
    ctx.fillStyle = '#8394a5'; ctx.beginPath(); ctx.arc(24, 24, 13, 0, Math.PI * 2); ctx.fill()
    return
  }
  const ports = CONNECTIONS[piece]
  if (piece === 'cross') {
    steel(ctx, 3, 1)
    steel(ctx, 0, 2)
    ctx.strokeStyle = '#dde4ec'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(24, 24, 10, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = '#444e58'
    ctx.fillRect(13, 13, 2, 2); ctx.fillRect(33, 33, 2, 2)
  } else steel(ctx, ports[0], ports[1])
  ctx.fillStyle = '#bbc5cf'
  for (const port of ports) {
    if (port % 2 === 0) ctx.fillRect(13, port === 0 ? 2 : 44, 22, 2)
    else ctx.fillRect(port === 1 ? 44 : 2, 13, 2, 22)
  }
  if (piece.startsWith('reservoir')) {
    ctx.fillStyle = '#424e5b'; ctx.fillRect(10, 8, 28, 32)
    ctx.fillStyle = '#b1c4ce'; ctx.fillRect(13, 11, 22, 26)
    ctx.strokeStyle = '#e0e6ec'; ctx.lineWidth = 2; ctx.strokeRect(10, 8, 28, 32)
  }
  if (piece.startsWith('valve')) {
    const direction = ({ 'valve-n': 0, 'valve-e': 1, 'valve-s': 2, 'valve-w': 3 } as Record<string, number>)[piece]
    ctx.save(); ctx.translate(24, 24); ctx.rotate(direction * Math.PI / 2)
    ctx.fillStyle = '#29343e'; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(-6, 3); ctx.lineTo(6, 3); ctx.closePath(); ctx.fill()
    ctx.fillStyle = '#dde4ec'; ctx.fillRect(-3, 5, 6, 5)
    ctx.strokeStyle = '#dde4ec'; ctx.lineWidth = 1; ctx.strokeRect(-2, 2, 4, 5)
    ctx.restore()
  }
}
function gold(ctx: CanvasRenderingContext2D, entry: Direction, exit: Direction, progress: number, clock: number, front: boolean) {
  trace(ctx, entry, exit, progress)
  ctx.lineWidth = 11
  ctx.lineCap = 'butt'
  ctx.strokeStyle = '#cf8d00'
  ctx.stroke()
  ctx.lineWidth = 7
  ctx.strokeStyle = '#ffcc33'
  ctx.stroke()
  ctx.lineWidth = 2
  ctx.strokeStyle = '#fff2b0'
  ctx.setLineDash([5, 19])
  ctx.lineDashOffset = -clock * .04
  ctx.stroke()
  ctx.setLineDash([])
  if (front) {
    const data = paths[entry][exit]
    const at = Math.min(POINTS - 1, Math.floor(progress * POINTS))
    const fraction = progress * POINTS - at
    const x = data[at * 2] + (data[at * 2 + 2] - data[at * 2]) * fraction
    const y = data[at * 2 + 1] + (data[at * 2 + 3] - data[at * 2 + 1]) * fraction
    ctx.fillStyle = '#ffcc33'
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#fff2b0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 4, Math.PI, Math.PI * 1.8); ctx.stroke()
  }
}
export class BoardRenderer {
  private layer = document.createElement('canvas')
  private context: CanvasRenderingContext2D | null
  private board: Piece[] | null = null
  private grid = false
  constructor() {
    this.layer.width = COLS * SIZE
    this.layer.height = ROWS * SIZE
    this.context = this.layer.getContext('2d')
  }
  draw(ctx: CanvasRenderingContext2D, game: PipeGame, time: number, cursor: number, grid: boolean, celebration = 0) {
    if (this.board !== game.board || this.grid !== grid) {
      this.board = game.board
      this.grid = grid
      if (this.context) for (let index = 0; index < game.board.length; index++) {
        this.context.save(); this.context.translate(index % COLS * SIZE, Math.floor(index / COLS) * SIZE)
        drawPiece(this.context, game.board[index], grid)
        this.context.restore()
      }
    }
    ctx.drawImage(this.layer, 0, 0)
    for (let index = 0; index < game.board.length; index++) {
      const piece = game.board[index]
      const filling = game.phase === 'flow' && game.head === index
      if (!game.filled[index] && !filling && !(celebration > 0 && game.placed[index])) continue
      ctx.save(); ctx.translate(index % COLS * SIZE, Math.floor(index / COLS) * SIZE)
      if (piece === 'source') gold(ctx, 3, 1, 1, time, false)
      else if (piece === 'cross') {
        if (game.filled[index] & 1) gold(ctx, 3, 1, 1, time, false)
        if (game.filled[index] & 2) gold(ctx, 0, 2, 1, time, false)
      } else if (game.filled[index]) gold(ctx, CONNECTIONS[piece][0], CONNECTIONS[piece][1] ?? CONNECTIONS[piece][0], 1, time, false)
      const progress = filling ? Math.max(0, Math.min(1, (time - game.started) / game.duration)) : game.filled[index] ? 1 : 0
      if (filling) gold(ctx, game.entry, game.exit, progress, time, true)
      if (piece.startsWith('reservoir')) {
        ctx.fillStyle = '#b1c4ce'; ctx.fillRect(13, 11, 22, 26)
        ctx.fillStyle = '#cf8d00'; ctx.fillRect(13, 37 - 26 * progress, 22, 26 * progress)
        ctx.fillStyle = '#ffcc33'; ctx.fillRect(15, 37 - 26 * progress, 18, 26 * progress)
        ctx.fillStyle = '#fff2b0'; ctx.fillRect(15, 37 - 26 * progress, 18, 1)
      }
      if (piece === 'drain' && game.filled[index]) {
        ctx.fillStyle = '#ffcc33'; ctx.beginPath(); ctx.arc(24, 24, 12, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = '#fff2b0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(24, 24, 4 + time % 700 / 100, 0, Math.PI * 2); ctx.stroke()
      }
      if (celebration > 0 && game.placed[index] && (Math.floor(celebration / 60) + index) % 7 === 0) {
        ctx.fillStyle = '#fff2b0'; ctx.globalAlpha = .3; ctx.fillRect(1, 1, 46, 46)
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
        ctx.strokeStyle = '#62ffe4'; ctx.lineWidth = 3; ctx.setLineDash([3, 3])
        ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([])
        ctx.fillStyle = '#102e35'; ctx.font = 'bold 10px monospace'; ctx.fillText(strings.portalLabels[i], Math.max(3, Math.min(468, x - 3)), Math.max(12, Math.min(328, y + 3)))
      }
    }
    if (game.replacement) {
      const burst = game.replacement
      const progress = Math.max(0, Math.min(1, (time - (burst.until - 250)) / 250))
      const cx = burst.index % COLS * SIZE + 24
      const cy = Math.floor(burst.index / COLS) * SIZE + 24
      ctx.fillStyle = '#708090'; ctx.fillRect(cx - 23, cy - 23, 46, 46)
      if (progress < .15) { ctx.fillStyle = '#ffffff'; ctx.fillRect(cx - 17, cy - 17, 34, 34) }
      for (let i = 0; i < 16; i++) {
        const angle = i * Math.PI / 8
        ctx.fillStyle = i % 3 === 0 ? '#ffcc33' : '#e0e6ec'
        ctx.fillRect(Math.round(cx + Math.cos(angle) * progress * 30), Math.round(cy + Math.sin(angle) * progress * 25 + progress * progress * 14), 2, 2)
      }
    }
    ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 2
    ctx.strokeRect(cursor % COLS * SIZE + 3, Math.floor(cursor / COLS) * SIZE + 3, 42, 42)
  }
  dispose() {
    this.layer.width = 0
    this.layer.height = 0
    this.context = null
    this.board = null
  }
}
