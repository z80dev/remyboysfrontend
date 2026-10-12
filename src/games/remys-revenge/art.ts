import { SIZE, Tile, type Game } from './engine'
import { drawBevel, drawLed, type RemyPalette } from '../kit'
export const DEFAULT_PALETTE: RemyPalette = {
  skin: '#e6bc92', hair: '#67482d', shirt: '#4088c0', bg: '#c0c080', accent: '#e0c040', eye: '#202020',
}
const scoreOptions = { digits: 8, on: '#202820', off: '#b8c098', bg: '#d0d8b0' }
const scoreBevel = { inset: true, width: 2 }
/** Only this procedural mouse is mirrored; no portrait or original Remy artwork is transformed. */
export function mouse(
  ctx: CanvasRenderingContext2D, x: number, y: number, palette: RemyPalette, shades: boolean, facing: -1 | 1 = 1, dead = false,
): void {
  ctx.save()
  ctx.translate(x + (facing < 0 ? 16 : 0), y)
  if (facing < 0) ctx.scale(-1, 1)
  ctx.fillStyle = '#606060'
  if (dead) {
    ctx.fillRect(3, 10, 11, 3)
    ctx.fillStyle = '#b8b8b8'
    ctx.fillRect(3, 8, 10, 4)
    ctx.fillRect(12, 10, 3, 2)
    ctx.fillStyle = palette.hair
    ctx.fillRect(5, 6, 3, 3)
    ctx.fillRect(9, 6, 3, 3)
    ctx.fillStyle = palette.shirt
    ctx.fillRect(5, 11, 4, 2)
    ctx.fillStyle = '#000'
    ctx.fillRect(10, 8, 1, 1)
    ctx.fillRect(12, 8, 1, 1)
    ctx.fillRect(11, 9, 1, 1)
    ctx.fillRect(10, 10, 1, 1)
    ctx.fillRect(12, 10, 1, 1)
    ctx.fillRect(14, 11, 1, 1)
  } else {
    ctx.fillRect(3, 5, 10, 7)
    ctx.fillRect(5, 12, 2, 2)
    ctx.fillRect(11, 12, 2, 2)
    ctx.fillStyle = '#b8b8b8'
    ctx.fillRect(3, 4, 9, 7)
    ctx.fillRect(12, 7, 3, 3)
    ctx.fillStyle = palette.hair
    ctx.fillRect(5, 1, 1, 1)
    ctx.fillRect(4, 2, 3, 3)
    ctx.fillRect(5, 5, 1, 1)
    ctx.fillRect(10, 1, 1, 1)
    ctx.fillRect(9, 2, 3, 3)
    ctx.fillRect(10, 5, 1, 1)
    ctx.fillRect(7, 1, 1, 3)
    ctx.fillRect(8, 2, 1, 2)
    ctx.fillStyle = palette.shirt
    ctx.fillRect(6, 9, 3, 3)
    ctx.fillStyle = '#000'
    ctx.fillRect(11, 6, shades ? 3 : 1, 1)
    ctx.fillRect(14, 8, 1, 1)
  }
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, dead ? 12 : 10, 3, 1)
  ctx.fillRect(0, dead ? 10 : 8, 1, 3)
  ctx.restore()
}
function cheese(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#b89820'
  ctx.fillRect(x + 2, y + 5, 12, 9)
  ctx.fillStyle = '#f0d040'
  for (let row = 4; row <= 12; row++) {
    const left = 4 - Math.floor((row - 4) / 3)
    ctx.fillRect(x + left, y + row, 14 - left, 1)
  }
  ctx.fillStyle = '#b89820'
  ctx.fillRect(x + 4, y + 7, 2, 2)
  ctx.fillRect(x + 10, y + 4, 2, 2)
  ctx.fillRect(x + 9, y + 10, 2, 2)
}
export function paintStatic(ctx: CanvasRenderingContext2D, g: Game): void {
  ctx.fillStyle = '#c0c080'
  ctx.fillRect(0, 0, 368, 368)
  for (let i = 0; i < g.cells.length; i++) {
    const x = i % SIZE * 16
    const y = Math.floor(i / SIZE) * 16
    const tile = g.cells[i]
    if (tile === Tile.Block || tile === Tile.Fixed) {
      ctx.fillStyle = tile === Tile.Block ? '#c0c0c0' : '#808080'
      ctx.fillRect(x, y, 16, 16)
      ctx.fillStyle = tile === Tile.Block ? '#fff' : '#b0b0b0'
      ctx.fillRect(x, y, 16, 1)
      ctx.fillRect(x, y, 1, 16)
      ctx.fillStyle = '#404040'
      ctx.fillRect(x + 15, y, 1, 16)
      ctx.fillRect(x, y + 15, 16, 1)
      if (tile === Tile.Fixed) {
        ctx.fillRect(x + 3, y + 3, 2, 2)
        ctx.fillRect(x + 11, y + 3, 2, 2)
        ctx.fillRect(x + 3, y + 11, 2, 2)
        ctx.fillRect(x + 11, y + 11, 2, 2)
      }
    } else if (tile === Tile.Cheese) cheese(ctx, x, y)
    else if (tile === Tile.Rug) {
      ctx.fillStyle = '#eedbb0'
      ctx.fillRect(x + 1, y + 2, 14, 12)
      for (let row = 2; row < 14; row += 2) {
        ctx.fillRect(x, y + row, 1, 1)
        ctx.fillRect(x + 15, y + row, 1, 1)
      }
      ctx.fillStyle = '#a03028'
      ctx.fillRect(x + 3, y + 3, 10, 10)
      ctx.fillStyle = '#405888'
      ctx.fillRect(x + 6, y + 5, 4, 6)
      ctx.fillStyle = '#eedbb0'
      ctx.fillRect(x + 7, y + 7, 2, 2)
    } else if (tile === Tile.Trap) {
      ctx.fillStyle = '#a87840'
      ctx.fillRect(x + 2, y + 4, 12, 9)
      ctx.fillStyle = '#e0bd80'
      ctx.fillRect(x + 3, y + 5, 10, 7)
      ctx.fillStyle = '#444'
      ctx.fillRect(x + 4, y + 3, 2, 10)
      ctx.fillRect(x + 4, y + 3, 9, 2)
      ctx.fillRect(x + 10, y + 3, 2, 8)
      ctx.fillStyle = '#f0d040'
      ctx.fillRect(x + 11, y + 10, 2, 2)
    }
  }
}
export function paintActors(ctx: CanvasRenderingContext2D, g: Game, palette: RemyPalette, shades: boolean): void {
  // All pose ages belong to the deterministic engine, so a repaint cannot consume the sweat frame.
  for (let i = 0; i < g.catCount; i++) {
    const at = g.cats[i]
    if (at < 0) continue
    const x = at % SIZE * 16
    const y = Math.floor(at / SIZE) * 16
    const sit = g.sitting[i]
    // A dark, stepped silhouette keeps the hairless cat readable at the native 16px size.
    ctx.fillStyle = '#5a2838'
    if (sit) {
      // Upright head, low rounded haunches, planted paws and an unmistakably curled tail.
      ctx.fillRect(x + 5, y + 2, 1, 1)
      ctx.fillRect(x + 4, y + 3, 3, 3)
      ctx.fillRect(x + 10, y + 2, 1, 1)
      ctx.fillRect(x + 9, y + 3, 3, 3)
      ctx.fillRect(x + 4, y + 5, 8, 5)
      ctx.fillRect(x + 5, y + 9, 8, 5)
      ctx.fillRect(x + 3, y + 11, 10, 3)
      ctx.fillRect(x + 3, y + 14, 11, 1)
      ctx.fillRect(x + 1, y + 11, 1, 3)
      ctx.fillRect(x + 1, y + 10, 3, 1)
      ctx.fillStyle = '#f0a8b8'
      ctx.fillRect(x + 5, y + 5, 6, 4)
      ctx.fillRect(x + 6, y + 9, 6, 4)
      ctx.fillRect(x + 4, y + 11, 8, 3)
      ctx.fillRect(x + 2, y + 12, 2, 1)
      ctx.fillStyle = '#c87890'
      ctx.fillRect(x + 8, y + 10, 1, 3)
      ctx.fillRect(x + 10, y + 11, 2, 1)
      ctx.fillRect(x + 5, y + 6, 1, 1)
      ctx.fillRect(x + 7, y + 6, 1, 1)
    } else {
      ctx.fillRect(x + 3, y + 1, 1, 1)
      ctx.fillRect(x + 2, y + 2, 3, 3)
      ctx.fillRect(x + 8, y + 1, 1, 1)
      ctx.fillRect(x + 7, y + 2, 3, 3)
      ctx.fillRect(x + 2, y + 4, 8, 5)
      ctx.fillRect(x + 6, y + 6, 7, 1)
      ctx.fillRect(x + 5, y + 7, 9, 6)
      ctx.fillRect(x + 5, y + 12, 2, 3)
      ctx.fillRect(x + 11, y + 12, 2, 3)
      ctx.fillRect(x + 13, y + 10, 2, 1)
      ctx.fillRect(x + 14, y + 7, 1, 4)
      ctx.fillRect(x + 13, y + 7, 1, 1)
      ctx.fillStyle = '#f0a8b8'
      ctx.fillRect(x + 3, y + 4, 6, 4)
      ctx.fillRect(x + 6, y + 7, 6, 5)
      ctx.fillRect(x + 5, y + 9, 8, 3)
      ctx.fillRect(x + 5, y + 12, 1, 2)
      ctx.fillRect(x + 11, y + 12, 1, 2)
      ctx.fillStyle = '#e07090'
      ctx.fillRect(x + 3, y + 3, 1, 2)
      ctx.fillRect(x + 8, y + 3, 1, 2)
      ctx.fillStyle = '#c87890'
      ctx.fillRect(x + 4, y + 4, 1, 1)
      ctx.fillRect(x + 6, y + 4, 1, 1)
      ctx.fillRect(x + 10, y + 8, 2, 1)
      ctx.fillRect(x + 10, y + 10, 2, 1)
      ctx.fillRect(x + 12, y + 7, 1, 5)
    }
    ctx.fillStyle = '#000'
    ctx.fillRect(x + (sit ? 10 : 4), y + (sit ? 7 : 6), 1, 1)
    ctx.fillStyle = '#fff'
    ctx.fillRect(x + (sit ? 9 : 5), y + (sit ? 7 : 6), 1, 1)
    ctx.fillStyle = '#e05070'
    ctx.fillRect(x + (sit ? 11 : 2), y + (sit ? 8 : 7), 1, 1)
    ctx.fillStyle = '#5a2838'
    ctx.fillRect(x + 1, y + 6, 1, 1)
    ctx.fillRect(x + 1, y + 8, 1, 1)
    ctx.fillRect(x + 7, y + 7, 1, 1)
    ctx.fillRect(x + 8, y + 8, 1, 1)
    ctx.fillStyle = '#e0b030'
    ctx.fillRect(x + 3, y + 9, 7, 1)
    ctx.fillRect(x + 6, y + 10, 3, 3)
    ctx.fillStyle = '#604010'
    ctx.fillRect(x + 6, y + 10, 3, 1)
    ctx.fillRect(x + 6, y + 11, 1, 1)
    ctx.fillRect(x + 6, y + 12, 3, 1)
    if (sit && g.elapsed - g.sittingSince[i] < 400) {
      ctx.fillStyle = '#60a0ff'
      ctx.fillRect(x + 13, y + 2, 1, 2)
      ctx.fillRect(x + 12, y + 4, 3, 2)
    }
  }
  for (let i = 0; i < g.yarnCount; i++) {
    const at = g.yarn[i]
    if (at < 0) continue
    const x = at % SIZE * 16
    const y = Math.floor(at / SIZE) * 16
    ctx.fillStyle = '#c878a0'
    ctx.fillRect(x + 4, y + 2, 8, 12)
    ctx.fillRect(x + 2, y + 4, 12, 8)
    ctx.fillStyle = '#f4b6d2'
    ctx.fillRect(x + 4, y + 3, 7, 10)
    ctx.fillRect(x + 3, y + 5, 9, 6)
    ctx.fillStyle = '#c878a0'
    // Three stepped curves wrap around the ball; all strands stay on the logical pixel grid.
    ctx.fillRect(x + 4, y + 4, 2, 1)
    ctx.fillRect(x + 6, y + 5, 4, 1)
    ctx.fillRect(x + 10, y + 6, 2, 1)
    ctx.fillRect(x + 3, y + 7, 2, 1)
    ctx.fillRect(x + 5, y + 8, 5, 1)
    ctx.fillRect(x + 10, y + 7, 3, 1)
    ctx.fillRect(x + 4, y + 10, 2, 1)
    ctx.fillRect(x + 6, y + 11, 4, 1)
    ctx.fillRect(x + 10, y + 10, 2, 1)
    ctx.fillRect(x + 12, y + 11, 1, 2)
    ctx.fillRect(x + 13, y + 13, 2, 1)
    ctx.fillRect(x + 14, y + 11, 1, 2)
  }
  const mx = g.mouse % SIZE * 16, my = Math.floor(g.mouse / SIZE) * 16
  mouse(ctx, mx, my, palette, shades, g.facing, g.phase === 'dead' || g.phase === 'over')
  if (g.rugged > 0) {
    const pips = Math.ceil(g.rugged / 1000)
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < pips ? '#fff' : '#604040'
      ctx.fillRect(mx + 1 + i * 3, my + 15, 2, 1)
    }
  }
}
export function paintHeader(
  ctx: CanvasRenderingContext2D, g: Game, palette: RemyPalette, shades: boolean, flash: boolean,
): void {
  ctx.fillStyle = '#c0c0c0'
  ctx.fillRect(0, 0, 400, 48)
  for (let i = 0; i < g.lives; i++) mouse(ctx, 12 + i * 20, 16, palette, shades)
  if (!flash) {
    const cx = 200
    const cy = 24
    const angle = Math.min(1, g.elapsed / (g.layout.duration * 1000)) * Math.PI * 2 - Math.PI / 2
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(cx, cy, 20, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#dedede'
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, 18, -Math.PI / 2, angle)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(cx, cy, 20, 0, Math.PI * 2)
    ctx.stroke()
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6
      ctx.fillStyle = '#000'
      ctx.fillRect(Math.round(cx + Math.sin(a) * 17), Math.round(cy - Math.cos(a) * 17), 1, 1)
    }
    for (let i = g.wave; i < g.layout.waveTimes.length; i++) {
      const a = g.layout.waveTimes[i] / g.layout.duration * Math.PI * 2 - Math.PI / 2
      ctx.fillStyle = '#0000c0'
      ctx.beginPath()
      ctx.arc(cx, cy, 19, a - 0.06, a + 0.06)
      ctx.arc(cx, cy, 13, a + 0.06, a - 0.06, true)
      ctx.closePath()
      ctx.fill()
    }
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(angle) * 15, cy + Math.sin(angle) * 15)
    ctx.stroke()
    ctx.fillStyle = '#000'
    ctx.fillRect(cx - 1, cy - 1, 2, 2)
  }
  drawBevel(ctx, 256, 10, 132, 28, scoreBevel)
  drawLed(ctx, g.score, 270, 13, scoreOptions)
}
