import { EGA, clearScreen, drawInput, drawSparkles, drawText, nearestEga } from '../qbasic'
import type { InputLine } from '../qbasic'
import type { RemyPalette } from '../kit'
import { HEIGHT, WIDTH, SUN_X, SUN_Y, SUN_RADIUS, type Match, type Round } from './engine'
import { SPRITE, STRINGS as S } from './strings'

export type ChibiPalette = { skin: number; hair: number; shirt: number; trousers: number }
export const HERO_PALETTE: ChibiPalette = { skin: 14, hair: 6, shirt: 10, trousers: 8 }
export const CIVILIAN_PALETTE: ChibiPalette = { skin: 12, hair: 0, shirt: 11, trousers: 8 }
export const CABALD_PALETTE: ChibiPalette = { skin: 14, hair: 14, shirt: 8, trousers: 0 }
const BANANA_POINTS = [[-3, -1], [-3, 0], [-2, 1], [-1, 2], [0, 2], [1, 2], [2, 1], [3, 0], [3, -1]] as const
const EXPLOSION_COLORS = [12, 14, 4] as const
export type Screen = 'dos' | 'intro' | 'setup' | 'menu' | 'preview' | 'play'
export type RenderView = {
  screen: Screen; clock: number; input: InputLine; setupStep: number; setupValues: string[]; names: [string, string]
  prompt: 'angle' | 'velocity'; angle: string; error: string; paused: boolean; cpu: boolean; cabaldMessage: boolean
  match: Match; palettes: [ChibiPalette, ChibiPalette]; skyline: HTMLCanvasElement | null
}

export function quantizePalette(palette: RemyPalette): ChibiPalette {
  let skin = nearestEga(palette.skin)
  if (![6, 7, 12, 14, 15].includes(skin)) skin = 12
  const shirt = nearestEga(palette.shirt)
  return { skin, hair: nearestEga(palette.hair), shirt, trousers: shirt === 8 || shirt === 7 ? 0 : 8 }
}

export function createSkylineLayer(round: Round): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(WIDTH, HEIGHT)
  const rgb = EGA.map((hex) => Number.parseInt(hex.slice(1), 16))
  for (let i = 0; i < round.pixels.length; i++) {
    const color = rgb[round.pixels[i]]
    image.data[i * 4] = color >> 16
    image.data[i * 4 + 1] = (color >> 8) & 255
    image.data[i * 4 + 2] = color & 255
    image.data[i * 4 + 3] = 255
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: number): void {
  ctx.fillStyle = EGA[color]
  x = Math.round(x)
  y = Math.round(y)
  radius = Math.floor(radius)
  for (let dy = -radius; dy <= radius; dy++) {
    const span = Math.floor(Math.sqrt(radius * radius - dy * dy))
    ctx.fillRect(x - span, y + dy, span * 2 + 1, 1)
  }
}

export function drawRemySprite(ctx: CanvasRenderingContext2D, x: number, y: number, palette: ChibiPalette, frame = 0, mirror = false, bald = false): void {
  x = Math.round(x)
  y = Math.round(y)
  if (bald) {
    ctx.fillStyle = EGA[4]
    for (let row = 6; row < 15; row++) ctx.fillRect(x + 2, y + row * 2, 26, row === 14 ? 1 : 2)
  }
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 15; col++) {
      let cell = SPRITE[row][col]
      const raiseLeft = frame === 1 || frame === 3
      const raiseRight = frame === 2 || frame === 3
      if (raiseLeft && col <= 2 && row >= 8 && row <= 10 || raiseRight && col >= 12 && row >= 8 && row <= 10) cell = '.'
      if (raiseLeft && col <= 1 && row >= 1 && row <= 5 || raiseRight && col >= 13 && row >= 1 && row <= 5) cell = 'S'
      if (raiseLeft && col >= 1 && col <= 2 && row >= 6 && row <= 7 || raiseRight && col >= 12 && col <= 13 && row >= 6 && row <= 7) cell = 'T'
      if (bald && row === 3 && col >= 4 && col <= 10) cell = 'K'
      if (cell === '.') continue
      const color = cell === 'H' ? bald ? palette.skin : palette.hair : cell === 'S' ? palette.skin
        : cell === 'T' ? palette.shirt : cell === 'P' ? palette.trousers : 0
      ctx.fillStyle = EGA[color]
      ctx.fillRect(x + (mirror ? 14 - col : col) * 2, y + row * 2, 2, 2)
    }
  }
}

export function drawSun(ctx: CanvasRenderingContext2D, gasp: boolean): void {
  disc(ctx, SUN_X, SUN_Y, SUN_RADIUS, 14)
  ctx.fillStyle = EGA[14]
  ctx.fillRect(SUN_X - 1, SUN_Y - 21, 2, 6)
  ctx.fillRect(SUN_X - 1, SUN_Y + 15, 2, 6)
  ctx.fillRect(SUN_X - 21, SUN_Y - 1, 6, 2)
  ctx.fillRect(SUN_X + 15, SUN_Y - 1, 6, 2)
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(SUN_X - 12 - i, SUN_Y - 12 - i, 2, 2)
    ctx.fillRect(SUN_X + 12 + i, SUN_Y - 12 - i, 2, 2)
    ctx.fillRect(SUN_X - 12 - i, SUN_Y + 12 + i, 2, 2)
    ctx.fillRect(SUN_X + 12 + i, SUN_Y + 12 + i, 2, 2)
  }
  const shadesY = SUN_Y - 3 - (gasp ? 6 : 0)
  ctx.fillStyle = EGA[0]
  ctx.fillRect(SUN_X - 9, shadesY, 18, 2)
  ctx.fillRect(SUN_X - 8, shadesY, 6, 4)
  ctx.fillRect(SUN_X + 2, shadesY, 6, 4)
  ctx.fillStyle = EGA[15]
  ctx.fillRect(SUN_X - 7, shadesY + 1, 1, 1)
  ctx.fillRect(SUN_X + 3, shadesY + 1, 1, 1)
  if (gasp) {
    disc(ctx, SUN_X, SUN_Y + 5, 3, 0)
    disc(ctx, SUN_X, SUN_Y + 5, 1, 14)
  } else {
    ctx.fillStyle = EGA[0]
    ctx.fillRect(SUN_X - 4, SUN_Y + 5, 1, 2)
    ctx.fillRect(SUN_X + 4, SUN_Y + 5, 1, 2)
    ctx.fillRect(SUN_X - 3, SUN_Y + 7, 7, 1)
  }
}

function drawBanana(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number): void {
  const points = BANANA_POINTS
  ctx.fillStyle = EGA[14]
  for (let i = 0; i < points.length; i++) {
    const px = points[i][0]
    const py = points[i][1]
    const dx = frame === 0 ? px : frame === 1 ? -py : frame === 2 ? -px : py
    const dy = frame === 0 ? py : frame === 1 ? px : frame === 2 ? -py : -px
    ctx.fillRect(Math.round(x) + dx, Math.round(y) + dy, 1, 1)
  }
  ctx.fillStyle = EGA[6]
  ctx.fillRect(Math.round(x) + (frame === 0 ? -3 : frame === 2 ? 3 : frame === 1 ? 1 : -1),
    Math.round(y) + (frame === 0 ? -2 : frame === 2 ? 2 : frame === 1 ? -3 : 3), 1, 1)
}

export function drawScreen(ctx: CanvasRenderingContext2D, view: RenderView): void {
  const { screen, clock, input, match } = view
  clearScreen(ctx, screen === 'dos' ? 0 : 1, WIDTH, HEIGHT)
  if (screen === 'dos') {
    drawText(ctx, S.dos, 8, 16, 7)
    drawInput(ctx, input, 1, 4, clock, 7, 0)
    return
  }
  if (screen === 'intro') {
    drawSparkles(ctx, Math.floor(clock / 100), 21)
    drawText(ctx, S.introTitle, (WIDTH - S.introTitle.length * 8) / 2, 64, 14)
    for (let i = 0; i < S.introLines.length; i++) drawText(ctx, S.introLines[i], 80, 120 + i * 16)
    drawText(ctx, S.continue, 208, 272, 14)
    return
  }
  if (screen === 'setup') {
    drawText(ctx, S.setupTitle, 280, 32, 14)
    for (let i = 0; i <= view.setupStep; i++) {
      drawText(ctx, S.setupPrompts[i], 24, 72 + i * 56)
      if (i < view.setupStep) drawText(ctx, view.setupValues[i], 24, 88 + i * 56, 14)
    }
    drawInput(ctx, input, 4, 7 + view.setupStep * 3.5, clock, 14)
    if (view.setupStep === 1) drawText(ctx, S.cpuHint, 24, 304, 7)
    if (view.error) drawText(ctx, view.error, 24, 328, 12)
    return
  }
  if (screen === 'menu' || screen === 'preview') {
    drawText(ctx, S.introTitle, (WIDTH - S.introTitle.length * 8) / 2, 48, 14)
    if (screen === 'menu') {
      for (let i = 0; i < S.menuLines.length; i++) drawText(ctx, S.menuLines[i], 256, 128 + i * 32)
    } else {
      drawText(ctx, S.preview, 200, 112)
      drawRemySprite(ctx, 152, 208, view.palettes[0], Math.floor(clock / 180) % 4)
      drawRemySprite(ctx, 456, 208, view.palettes[1], Math.floor(clock / 180) % 4, true, view.cpu)
      drawText(ctx, S.continue, 208, 288, 14)
    }
    return
  }
  const round = match.round
  if (view.skyline) ctx.drawImage(view.skyline, 0, 0)
  drawSun(ctx, round.sunGasp)
  for (let i = 0; i < round.buildings.length; i++) {
    const b = round.buildings[i]
    if (!b.tower) continue
    ctx.fillStyle = EGA[8]
    ctx.fillRect(b.x + Math.floor(b.width / 2), b.y - 10, 2, 10)
    ctx.fillStyle = EGA[12]
    ctx.fillRect(b.x + Math.floor(b.width / 2), b.y - 12, 2, 2)
  }
  for (let side = 0; side < 2; side++) {
    const p = round.players[side]
    if (!p.alive) continue
    const frame = match.phase === 'dance' && match.winner === side ? match.danceBeat % 2 + 1
      : match.phase === 'flight' && round.turn === side && round.shot.time < 0.3 ? 1 : 0
    drawRemySprite(ctx, p.x, p.y, view.palettes[side], frame, side === 1, side === 1 && view.cpu)
  }
  if (match.phase === 'flight' && round.shot.y > -6) drawBanana(ctx, round.shot.x, round.shot.y, round.shot.frame)
  if (match.phase === 'explosion') {
    disc(ctx, round.impactX, round.impactY, Math.max(1, match.explosionRadius * Math.min(1, match.elapsed / 0.35)),
      EXPLOSION_COLORS[Math.floor(match.elapsed * 30) % 3])
  }
  ctx.fillStyle = EGA[1]
  ctx.fillRect(0, 330, WIDTH, 20)
  const score = S.scoreLine(match.scores[0], match.scores[1])
  drawText(ctx, score, (WIDTH - score.length * 8) / 2, 330, 15)
  const windEnd = 320 + round.wind * 4
  ctx.fillStyle = EGA[14]
  if (round.wind !== 0) {
    ctx.fillRect(Math.min(320, windEnd), 326, Math.max(1, Math.abs(round.wind) * 4), 1)
    const direction = Math.sign(round.wind)
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(windEnd - direction * i, 326 - i, 1, 1)
      ctx.fillRect(windEnd - direction * i, 326 + i, 1, 1)
    }
  }
  drawText(ctx, view.names[0], 8, 0, 15, 1)
  drawText(ctx, view.names[1], WIDTH - 8 - view.names[1].length * 8, 0, 15, 1)
  if (match.phase === 'aim' || match.phase === 'flight' && round.turn === 1 && view.cpu) {
    const x = round.turn === 0 ? 8 : 472
    drawText(ctx, S.angle, x, 16, 15, 1)
    drawText(ctx, S.velocity, x, 32, 15, 1)
    if (view.prompt === 'velocity') drawText(ctx, view.angle, x + 80, 16, 14, 1)
    drawInput(ctx, input, x / 8 + 11, view.prompt === 'angle' ? 2 : 3, clock, 14)
    if (view.error) drawText(ctx, view.error, 8, 48, 12, 1)
  }
  if (match.phase === 'over') {
    ctx.fillStyle = EGA[1]
    ctx.fillRect(48, 96, 544, 144)
    drawText(ctx, S.gameOver, 280, 104, 14)
    drawText(ctx, view.names[0] + ' ' + match.scores[0], 80, 136)
    drawText(ctx, view.names[1] + ' ' + match.scores[1], 80, 152)
    if (view.cpu && view.cabaldMessage) drawText(ctx, match.winner === 1 ? S.cpuWin : S.humanWin,
      match.winner === 1 ? 128 : 224, 184, 14)
    drawText(ctx, S.continue, 208, 216)
  }
  if (view.paused) {
    ctx.fillStyle = EGA[0]
    ctx.fillRect(112, 152, 416, 40)
    drawText(ctx, S.paused, 144, 164, 14)
  }
}
