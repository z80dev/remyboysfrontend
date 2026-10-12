import { drawBevel, drawLed, FLAG_COLORS } from '../kit'
import type { FrontRemyHeads, RemyPalette } from '../kit'
import { FLAG, QUESTION, REVEALED, mineCounter } from './engine'
import type { Game } from './engine'

export const HEADER_HEIGHT = 49
export const BOARD_X = 12
export const BOARD_Y = 6
export type MineArt = { heads: FrontRemyHeads; ids: number[] }
export const FALLBACK_PALETTE: RemyPalette = { skin: '#ffff00', hair: '#805000', shirt: '#0000ff', bg: '#c0c0c0', accent: '#ffffff', eye: '#000000' }
export const MONOCHROME_PALETTE: RemyPalette = { skin: '#ffffff', hair: '#000000', shirt: '#000000', bg: '#c0c0c0', accent: '#ffffff', eye: '#000000' }
const NUMBER_COLORS = ['#000000', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000000', '#808080']
const DIGITS = [
  [],
  ['0011000', '0111000', '0011000', '0011000', '0011000', '0011000', '0011000', '0011000', '1111110', '1111110'],
  ['0111100', '1111110', '1100110', '0000110', '0001100', '0011000', '0110000', '1100000', '1111110', '1111110'],
  ['1111100', '1111110', '0000110', '0001100', '0011100', '0000110', '0000110', '1100110', '1111110', '0111100'],
  ['0001100', '0011100', '0111100', '1101100', '1101100', '1111110', '1111110', '0001100', '0001100', '0001100'],
  ['1111110', '1111110', '1100000', '1100000', '1111100', '1111110', '0000110', '1100110', '1111110', '0111100'],
  ['0011100', '0111000', '1100000', '1100000', '1111100', '1111110', '1100110', '1100110', '1111110', '0111100'],
  ['1111110', '1111110', '0000110', '0001100', '0011000', '0011000', '0110000', '0110000', '0110000', '0110000'],
  ['0111100', '1111110', '1100110', '1100110', '0111100', '1111110', '1100110', '1100110', '1111110', '0111100'],
]
const PUFF_CIRCLES = [[10, 2], [12, 1], [12, 3]] as const
const PUFF_OUTLINE = ['0110', '1111', '1111', '0110']
const QUESTION_GLYPH = ['0111100', '1111110', '1100110', '0000110', '0001100', '0011000', '0011000', '0000000', '0011000', '0011000']

function bitmap(ctx: CanvasRenderingContext2D, rows: readonly string[], x: number, y: number, color: string): void {
  ctx.fillStyle = color
  for (let row = 0; row < rows.length; row++) {
    for (let col = 0; col < rows[row].length; col++) if (rows[row][col] === '1') ctx.fillRect(x + col, y + row, 1, 1)
  }
}

export function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number, color = true): void {
  ctx.fillStyle = '#000000'
  ctx.fillRect(x + 8, y + 3, 1, 9)
  ctx.fillRect(x + 6, y + 12, 5, 1)
  ctx.fillRect(x + 4, y + 13, 9, 2)
  if (color) {
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = FLAG_COLORS[i]
      ctx.fillRect(x + 2 + (i % 2) * 3, y + 3 + Math.floor(i / 2) * 2, 3, 2)
    }
  } else {
    ctx.fillStyle = '#000000'
    ctx.fillRect(x + 2, y + 3, 6, 4)
  }
}

function classicMine(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#000000'
  ctx.fillRect(x + 5, y + 4, 6, 8)
  ctx.fillRect(x + 4, y + 5, 8, 6)
  ctx.fillRect(x + 7, y + 2, 2, 12)
  ctx.fillRect(x + 2, y + 7, 12, 2)
  for (let i = 0; i < 10; i++) {
    ctx.fillRect(x + 3 + i, y + 3 + i, 1, 1)
    ctx.fillRect(x + 12 - i, y + 3 + i, 1, 1)
  }
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x + 6, y + 5, 2, 2)
}

function faceSprite(ctx: CanvasRenderingContext2D, x: number, y: number, palette: RemyPalette, state: 'smile' | 'surprise' | 'dead' | 'win', color: boolean): void {
  ctx.fillStyle = '#000000'
  ctx.fillRect(x + 5, y, 7, 1)
  ctx.fillRect(x + 3, y + 1, 11, 1)
  ctx.fillRect(x + 2, y + 2, 13, 2)
  ctx.fillRect(x + 1, y + 4, 15, 9)
  ctx.fillRect(x + 2, y + 13, 13, 2)
  ctx.fillRect(x + 4, y + 15, 9, 1)
  ctx.fillRect(x + 6, y + 16, 5, 1)
  ctx.fillStyle = palette.skin
  ctx.fillRect(x + 5, y + 1, 7, 1)
  ctx.fillRect(x + 3, y + 2, 11, 2)
  ctx.fillRect(x + 2, y + 4, 13, 9)
  ctx.fillRect(x + 3, y + 13, 11, 1)
  ctx.fillRect(x + 5, y + 14, 7, 1)
  ctx.fillRect(x + 6, y + 15, 5, 1)
  const skin = Number.parseInt(palette.skin.slice(1), 16)
  const red = skin >> 16
  const green = (skin >> 8) & 255
  const blue = skin & 255
  if (Math.max(Math.abs(red - 192), Math.abs(green - 192), Math.abs(blue - 192)) < 48) {
    const shade = (Math.floor(red * 0.65) << 16) | (Math.floor(green * 0.65) << 8) | Math.floor(blue * 0.65)
    ctx.fillStyle = `#${shade.toString(16).padStart(6, '0')}`
    ctx.fillRect(x + 2, y + 4, 1, 9)
    ctx.fillRect(x + 14, y + 4, 1, 9)
    ctx.fillRect(x + 3, y + 13, 11, 1)
    ctx.fillRect(x + 5, y + 14, 7, 1)
  }
  if (state !== 'dead') {
    ctx.fillStyle = palette.hair
    ctx.fillRect(x + 4, y + 1, 8, 2)
    ctx.fillRect(x + 3, y + 3, 11, 1)
    ctx.fillRect(x + 3, y + 4, 2, 3)
    ctx.fillRect(x + 12, y + 4, 2, 2)
    const hair = Number.parseInt(palette.hair.slice(1), 16)
    const shade = (((hair >> 16) >> 1) << 16) | (((((hair >> 8) & 255) >> 1)) << 8) | ((hair & 255) >> 1)
    ctx.fillStyle = `#${shade.toString(16).padStart(6, '0')}`
    ctx.fillRect(x + 3, y + 4, 11, 1)
    ctx.fillRect(x + 3, y + 5, 2, 1)
    ctx.fillRect(x + 12, y + 5, 2, 1)
  } else {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x + 6, y + 2, 1, 1)
  }
  ctx.fillStyle = '#000000'
  if (state === 'dead') {
    for (const eyeX of [5, 10]) {
      ctx.fillRect(x + eyeX, y + 7, 1, 1)
      ctx.fillRect(x + eyeX + 1, y + 8, 1, 1)
      ctx.fillRect(x + eyeX + 2, y + 9, 1, 1)
      ctx.fillRect(x + eyeX + 2, y + 7, 1, 1)
      ctx.fillRect(x + eyeX, y + 9, 1, 1)
    }
    ctx.fillRect(x + 7, y + 12, 4, 1)
    ctx.fillStyle = color ? '#80c0ff' : '#000000'
    ctx.fillRect(x + 12, y + 10, 1, 1)
  } else if (state === 'win') {
    ctx.fillRect(x + 5, y + 7, 7, 2)
    ctx.fillRect(x + 5, y + 9, 3, 1)
    ctx.fillRect(x + 10, y + 9, 2, 1)
    ctx.fillRect(x + 6, y + 12, 1, 1)
    ctx.fillRect(x + 7, y + 13, 3, 1)
    ctx.fillRect(x + 10, y + 12, 1, 1)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x + 6, y + 7, 1, 1)
  } else {
    ctx.fillRect(x + 5, y + 7, 2, 3)
    ctx.fillRect(x + 10, y + 7, 2, 3)
    if (state === 'surprise') {
      ctx.fillRect(x + 7, y + 11, 3, 3)
      ctx.fillStyle = palette.skin
      ctx.fillRect(x + 8, y + 12, 1, 1)
    } else {
      ctx.fillRect(x + 6, y + 12, 1, 1)
      ctx.fillRect(x + 7, y + 13, 3, 1)
      ctx.fillRect(x + 10, y + 12, 1, 1)
    }
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x + 5, y + 7, 1, 1)
    ctx.fillRect(x + 10, y + 7, 1, 1)
  }
}

export function drawHeader(ctx: CanvasRenderingContext2D, game: Game, width: number, palette: RemyPalette, pressing: boolean, facePressed: boolean, outer = true, color = true): void {
  if (outer) drawBevel(ctx, 0, 0, width, game.config.rows * 16 + 63, { width: 3, face: true, miter: true })
  else {
    ctx.fillStyle = '#c0c0c0'
    ctx.fillRect(0, 0, width, HEADER_HEIGHT)
  }
  drawBevel(ctx, 9, 9, width - 14, 37, { inset: true, width: 2, face: true, miter: true })
  for (const x of [13, width - 50]) drawBevel(ctx, x, 15, 41, 25, { inset: true, width: 1, face: true, miter: true })
  drawLed(ctx, mineCounter(game), 14, 16, { off: '#800000' })
  drawLed(ctx, game.seconds, width - 49, 16, { off: '#800000' })
  const x = Math.floor(width / 2) - 12
  if (facePressed) {
    ctx.fillStyle = '#c0c0c0'
    ctx.fillRect(x, 15, 24, 24)
    ctx.fillStyle = '#808080'
    ctx.fillRect(x, 15, 24, 1)
    ctx.fillRect(x, 15, 1, 24)
  } else drawBevel(ctx, x, 15, 24, 24, { width: 2, face: true, miter: true })
  const state = game.status === 'lost' ? 'dead' : game.status === 'won' ? 'win' : pressing ? 'surprise' : 'smile'
  faceSprite(ctx, x + 3 + Number(facePressed), 18 + Number(facePressed), palette, state, color)
}

export function drawBoard(ctx: CanvasRenderingContext2D, game: Game, color: boolean, preview: readonly number[], cursor: number | null, art: MineArt | null, outer = true): void {
  const width = game.config.cols * 16 + 20
  const height = game.config.rows * 16 + 14
  if (outer) drawBevel(ctx, 0, -HEADER_HEIGHT, width, height + HEADER_HEIGHT, { width: 3, face: true, miter: true })
  else {
    ctx.fillStyle = '#c0c0c0'
    ctx.fillRect(0, 0, width, height)
  }
  drawBevel(ctx, 9, 3, game.config.cols * 16 + 6, game.config.rows * 16 + 6, { inset: true, width: 3, face: true, miter: true })
  let mineOrdinal = 0
  for (let i = 0; i < game.cells.length; i++) {
    const x = BOARD_X + (i % game.config.cols) * 16
    const y = BOARD_Y + Math.floor(i / game.config.cols) * 16
    const cell = game.cells[i]
    const mineId = art?.ids[mineOrdinal % art.ids.length]
    if (game.mines[i]) mineOrdinal++
    const wrongFlag = game.status === 'lost' && cell === FLAG && !game.mines[i]
    const showMine = (game.status === 'lost' && game.mines[i] && cell !== FLAG) || wrongFlag
    const pressed = preview.includes(i) && cell !== FLAG && cell !== REVEALED
    const exploded = game.exploded.has(i)
    if (cell === REVEALED || showMine || pressed) {
      ctx.fillStyle = exploded ? '#ff0000' : '#c0c0c0'
      ctx.fillRect(x, y, 16, 16)
      ctx.fillStyle = '#808080'
      ctx.fillRect(x, y, 16, 1)
      ctx.fillRect(x, y, 1, 16)
    } else drawBevel(ctx, x, y, 16, 16, { width: 2, face: true, miter: true })
    if (showMine || (cell === REVEALED && game.mines[i])) {
      if (color && art && mineId !== undefined) {
        const r = art.heads.rect(mineId)
        ctx.save()
        ctx.beginPath()
        ctx.rect(x + 1, y + 1, 15, 15)
        ctx.clip()
        ctx.drawImage(art.heads.front, r.sx, r.sy, r.sw, r.sh, x + 1, y + 1, 16, 16)
        if (exploded) {
          ctx.fillStyle = '#000000'
          ctx.fillRect(x + 7, y + 2, 1, 2)
          ctx.fillRect(x + 8, y + 4, 1, 2)
          ctx.fillRect(x + 7, y + 6, 1, 2)
          for (const [px, py] of PUFF_CIRCLES) bitmap(ctx, PUFF_OUTLINE, x + px, y + py, '#000000')
          ctx.fillStyle = '#ffffff'
          for (const [px, py] of PUFF_CIRCLES) ctx.fillRect(x + px + 1, y + py + 1, 2, 2)
        }
        ctx.restore()
      } else classicMine(ctx, x, y)
      if (wrongFlag) {
        ctx.fillStyle = '#ff0000'
        for (let n = 1; n < 15; n++) {
          ctx.fillRect(x + n, y + n, 1, 1)
          ctx.fillRect(x + 15 - n, y + n, 1, 1)
        }
      }
    } else if (cell === FLAG) drawFlag(ctx, x, y, color)
    else if (cell === QUESTION) bitmap(ctx, QUESTION_GLYPH, x + 5, y + 3, '#000000')
    else if (cell === REVEALED && game.numbers[i]) bitmap(ctx, DIGITS[game.numbers[i]], x + 5, y + 3, color ? NUMBER_COLORS[game.numbers[i]] : '#000000')
    if (cursor === i) {
      ctx.fillStyle = '#000000'
      for (let n = 1; n < 15; n += 2) {
        ctx.fillRect(x + n, y + 1, 1, 1)
        ctx.fillRect(x + n, y + 14, 1, 1)
        ctx.fillRect(x + 1, y + n, 1, 1)
        ctx.fillRect(x + 14, y + n, 1, 1)
      }
    }
  }
}

export function cellAt(game: Game, x: number, y: number): number {
  const col = Math.floor((x - BOARD_X) / 16)
  const row = Math.floor((y - BOARD_Y) / 16)
  return col < 0 || col >= game.config.cols || row < 0 || row >= game.config.rows ? -1 : row * game.config.cols + col
}
