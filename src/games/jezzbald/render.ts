import type { HeadRect, RemyHeads } from '../kit/remy'
import { CELL, COLS, HEIGHT, ROWS, WIDTH, type Game, type Orientation } from './engine'

export type Art = { portrait: HTMLImageElement | null; bg: string; heads: RemyHeads | null; rects: HeadRect[]; idx: number; epithet: string }
export type Painter = { field: HTMLCanvasElement; reveal: HTMLCanvasElement; revision: number; dirty: boolean; art: Art }
export function createPainter(): Painter {
  const field = document.createElement('canvas')
  const reveal = document.createElement('canvas')
  field.width = reveal.width = WIDTH
  field.height = reveal.height = HEIGHT
  return { field, reveal, revision: -1, dirty: true, art: { portrait: null, bg: '#808080', heads: null, rects: [], idx: -1, epithet: '' } }
}

/** All photo crops use the same centred 320px destination. No per-cell rescaling or mirrored art. */
function cache(p: Painter, g: Game, pictures: boolean): void {
  const ctx = p.field.getContext('2d')
  const reveal = p.reveal.getContext('2d')
  if (!ctx || !reveal) return
  reveal.fillStyle = pictures ? p.art.bg : '#808080'
  reveal.fillRect(0, 0, WIDTH, HEIGHT)
  if (pictures && p.art.portrait) reveal.drawImage(p.art.portrait, (WIDTH - HEIGHT) / 2, 0, HEIGHT, HEIGHT)
  ctx.fillStyle = '#000020'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const px = x * CELL
    const py = y * CELL
    if (g.cells[y * COLS + x]) {
      ctx.drawImage(p.reveal, px, py, CELL, CELL, px, py, CELL, CELL)
      if (!pictures || !p.art.portrait) {
        ctx.fillStyle = '#b0b0b0'
        ctx.fillRect(px, py, CELL, 1)
        ctx.fillRect(px, py, 1, CELL)
        ctx.fillStyle = '#404040'
        ctx.fillRect(px + CELL - 1, py, 1, CELL)
        ctx.fillRect(px, py + CELL - 1, CELL, 1)
      }
    } else {
      ctx.fillStyle = '#202050'
      ctx.fillRect(px, py, CELL, 1)
      ctx.fillRect(px, py, 1, CELL)
    }
  }
  p.revision = g.revision
  p.dirty = false
}

export function draw(ctx: CanvasRenderingContext2D, p: Painter, g: Game, cursorX: number, cursorY: number,
  orientation: Orientation, pictures: boolean, fade = 0): void {
  if (p.dirty || p.revision !== g.revision) cache(p, g, pictures)
  ctx.drawImage(p.field, 0, 0)
  const cx = g.wallX * CELL + CELL / 2
  const cy = g.wallY * CELL + CELL / 2
  for (let i = 0; i < 2; i++) {
    const h = g.halves[i]
    if (!h.active) continue
    const a = h.direction < 0 ? -h.length : 0
    const x = g.orientation === 'horizontal' ? cx + a : cx - CELL / 2
    const y = g.orientation === 'vertical' ? cy + a : cy - CELL / 2
    const w = g.orientation === 'horizontal' ? h.length : CELL
    const height = g.orientation === 'vertical' ? h.length : CELL
    ctx.fillStyle = i === 0 ? '#ff0000' : '#0000ff'
    ctx.fillRect(x, y, w, height)
    ctx.fillStyle = i === 0 ? '#ff8080' : '#8080ff'
    ctx.fillRect(x, y, w, 1)
    ctx.fillRect(x, y, 1, height)
  }
  for (let i = 0; i < g.atomCount; i++) {
    const rect = p.art.rects[i]
    const bounce = g.elapsed - g.bounceAt[i] < 80
    const w = bounce && (g.bounceAxis[i] & 1) ? 14 : bounce ? 18 : 16
    const h = bounce && (g.bounceAxis[i] & 2) ? 14 : bounce ? 18 : 16
    const x = Math.round(g.x[i] - w / 2)
    const y = Math.round(g.y[i] - h / 2)
    if (p.art.heads && rect) {
      const atlas = Math.floor(g.elapsed / 120) % 2 ? p.art.heads.side : p.art.heads.front
      ctx.drawImage(atlas, rect.sx, rect.sy, rect.sw, rect.sh, x, y, w, h)
    } else {
      ctx.fillStyle = '#ff2020'
      ctx.beginPath()
      ctx.ellipse(g.x[i], g.y[i], w / 2 - 1, h / 2 - 1, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      const spin = Math.floor(g.elapsed / 120) % 2
      ctx.fillRect(x + 3 + spin * 3, y + 3, 3, h - 6)
    }
  }
  if (fade > 0) {
    ctx.globalAlpha = fade
    ctx.drawImage(p.reveal, 0, 0)
    ctx.globalAlpha = 1
  }
  if (g.phase === 'playing') {
    const x = cursorX * CELL + CELL / 2
    const y = cursorY * CELL + CELL / 2
    ctx.save()
    ctx.translate(x, y)
    if (orientation === 'vertical') ctx.rotate(Math.PI / 2)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(-6, 0); ctx.lineTo(6, 0)
    ctx.moveTo(-3, -3); ctx.lineTo(-6, 0); ctx.lineTo(-3, 3)
    ctx.moveTo(3, -3); ctx.lineTo(6, 0); ctx.lineTo(3, 3)
    ctx.stroke()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()
  }
}
