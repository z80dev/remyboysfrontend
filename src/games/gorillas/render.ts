import { EGA, clearScreen, cursorVisible, drawInput, drawSparkles, drawText, quantizeRemyPalette } from '../qbasic'
import type { InputLine } from '../qbasic'
import type { RemyPalette } from '../kit'
import { HEIGHT, WIDTH, SUN_X, SUN_Y, SUN_RADIUS, type Match, type Round } from './engine'
import { SPRITE, STRINGS as S } from './strings'

export type ChibiPalette = { skin: number; hair: number; shirt: number; trousers: number }
export const HERO_PALETTE: ChibiPalette = { skin: 14, hair: 6, shirt: 10, trousers: 8 }
export const CIVILIAN_PALETTE: ChibiPalette = { skin: 12, hair: 0, shirt: 11, trousers: 8 }
export const CABALD_PALETTE: ChibiPalette = { skin: 14, hair: 14, shirt: 8, trousers: 0 }
const BANANA_POINTS = [
  [-3, -2], [-3, -1], [3, -2], [3, -1], [-3, 0], [-2, 0], [2, 0], [3, 0],
  [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [-2, 2], [-1, 2], [0, 2], [1, 2], [2, 2],
] as const
const EXPLOSION_COLORS = [12, 14, 4] as const
const SETUP_COLUMNS = [13, 14, 17, 17] as const
export type Screen = 'dos' | 'intro' | 'setup' | 'menu' | 'preview' | 'play' | 'over'
export function screenHeight(screen: Screen): number {
  return screen === 'play' ? HEIGHT : 400
}
export type RenderView = {
  screen: Screen; clock: number; input: InputLine; setupStep: number; setupValues: string[]; names: [string, string]
  prompt: 'angle' | 'velocity'; angle: string; error: string; paused: boolean; cpu: boolean; cabaldMessage: boolean
  match: Match; palettes: [ChibiPalette, ChibiPalette]; skyline: HTMLCanvasElement | null; sunGaspAt: number
}

export function quantizePalette(palette: RemyPalette): ChibiPalette {
  const { skin, hair, shirt } = quantizeRemyPalette(palette)
  return { skin, hair, shirt, trousers: shirt === 8 || shirt === 7 ? 0 : 8 }
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
    ctx.fillRect(x + 2, y + 12, 26, 16)
    for (let col = 1; col < 14; col += 2) ctx.fillRect(x + col * 2, y + 28, 2, 2)
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

export function drawSun(ctx: CanvasRenderingContext2D, gasp: boolean, pop = 22): void {
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
  const shadesY = SUN_Y - 3 - (gasp ? Math.min(22, Math.floor(pop)) : 0)
  ctx.fillStyle = EGA[0]
  ctx.fillRect(SUN_X - 9, shadesY, 18, 2)
  ctx.fillRect(SUN_X - 8, shadesY, 6, 4)
  ctx.fillRect(SUN_X + 2, shadesY, 6, 4)
  ctx.fillStyle = EGA[15]
  ctx.fillRect(SUN_X - 7, shadesY + 1, 1, 1)
  ctx.fillRect(SUN_X + 3, shadesY + 1, 1, 1)
  if (gasp) {
    ctx.fillStyle = EGA[0]
    ctx.fillRect(SUN_X - 1, SUN_Y + 3, 3, 1)
    ctx.fillRect(SUN_X - 2, SUN_Y + 4, 1, 4)
    ctx.fillRect(SUN_X + 2, SUN_Y + 4, 1, 4)
    ctx.fillRect(SUN_X - 1, SUN_Y + 8, 3, 1)
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

export function drawScreen(ctx: CanvasRenderingContext2D, view: RenderView, touch: boolean): void {
  const { screen, clock, input, match } = view
  clearScreen(ctx, screen === 'play' ? 1 : 0, WIDTH, screenHeight(screen))
  if (screen === 'dos') {
    drawText(ctx, S.dos, 8, 16, 7)
    drawInput(ctx, input, 1, 4, clock, 7, 0)
    return
  }
  if (screen === 'intro') {
    drawSparkles(ctx, Math.floor(clock / 100), 22, 12, 0, 5)
    drawText(ctx, S.introTitle, (WIDTH - S.introTitle.length * 8) / 2, 64, 15)
    for (let i = 0; i < S.introLines.length; i++) {
      const line = S.introLines[i]
      drawText(ctx, line, (WIDTH - line.length * 8) / 2, 120 + i * 16, 7)
    }
    const continueText = touch ? S.touchContinue : S.continue
    drawText(ctx, continueText, (WIDTH - continueText.length * 8) / 2, 368, 7)
    return
  }
  if (screen === 'setup' || screen === 'menu') {
    const answered = screen === 'menu' ? S.setupPrompts.length : view.setupStep
    for (let i = 0; i <= Math.min(answered, S.setupPrompts.length - 1); i++) {
      const row = 5 + i * 2
      const prompt = S.setupPrompts[i]
      const x = (SETUP_COLUMNS[i] - 1) * 8
      drawText(ctx, prompt, x, (row - 1) * 16, 7, 0)
      const col = SETUP_COLUMNS[i] + prompt.length + 1
      const answer = i < answered ? view.setupValues[i] ?? '' : input.value + (cursorVisible(clock) ? '_' : ' ')
      const available = 81 - col
      if (answer.length <= available) drawText(ctx, answer, (col - 1) * 8, (row - 1) * 16, 7, 0)
      else {
        drawText(ctx, answer.slice(0, available), (col - 1) * 8, (row - 1) * 16, 7, 0)
        drawText(ctx, answer.slice(available), x, row * 16, 7, 0)
      }
    }
    if (screen === 'setup') {
      if (view.setupStep === 1) drawText(ctx, S.cpuHint, 104, 208, 7, 0)
      if (view.error) drawText(ctx, view.error, 96, 256, 12, 0)
    } else {
      for (let i = 0; i < S.menuLines.length; i++) drawText(ctx, S.menuLines[i], 256, 208 + i * 32, 7, 0)
      drawText(ctx, S.choice, 256, 320, 7, 0)
      drawInput(ctx, input, 33 + S.choice.length + 1, 21, clock, 7, 0)
    }
    return
  }
  if (screen === 'preview') {
    drawText(ctx, S.introTitle, (WIDTH - S.introTitle.length * 8) / 2, 48, 15)
    drawText(ctx, S.starring, (WIDTH - S.starring.length * 8) / 2, 112, 7)
    const cast = S.previewCast(view.names[0], view.names[1])
    drawText(ctx, cast, (WIDTH - cast.length * 8) / 2, 144, 7)
    drawRemySprite(ctx, 152, 208, view.palettes[0], Math.floor(clock / 180) % 4)
    drawRemySprite(ctx, 456, 208, view.palettes[1], Math.floor(clock / 180) % 4, true, view.cpu)
    const continueText = touch ? S.touchContinue : S.continue
    drawText(ctx, continueText, (WIDTH - continueText.length * 8) / 2, 368, 7)
    return
  }
  if (screen === 'over') {
    drawSparkles(ctx, Math.floor(clock / 100), 22, 12, 0, 5)
    drawText(ctx, S.gameOver, (WIDTH - S.gameOver.length * 8) / 2, 80, 7)
    drawText(ctx, S.score, 232, 128, 7)
    for (let side = 0; side < 2; side++) {
      drawText(ctx, view.names[side], 104, 160 + side * 32, 7)
      drawText(ctx, String(match.scores[side]), 392, 160 + side * 32, 7)
    }
    const result = match.winner === -1 ? view.cpu ? S.cpuDraw : S.draw
      : view.cpu ? match.winner === 1 ? view.cabaldMessage ? S.cpuWin : S.cpuWinOnly : S.humanWin
        : S.matchWin(view.names[match.winner])
    drawText(ctx, result, (WIDTH - result.length * 8) / 2, 256, 7)
    const continueText = touch ? S.touchContinue : S.continue
    drawText(ctx, continueText, (WIDTH - continueText.length * 8) / 2, 368, 7)
    return
  }
  const round = match.round
  if (view.skyline) ctx.drawImage(view.skyline, 0, 0)
  drawSun(ctx, round.sunGasp, (view.clock - view.sunGaspAt) * 0.09)
  for (let i = 0; i < round.buildings.length; i++) {
    const b = round.buildings[i]
    const antennaX = b.x + Math.floor(b.width / 2)
    if (!b.tower || round.pixels[b.y * WIDTH + antennaX] === 1) continue
    ctx.fillStyle = EGA[8]
    ctx.fillRect(antennaX, b.y - 10, 2, 10)
    if (Math.floor(view.clock * 60 / 1000 / 32) % 2 === 0) {
      ctx.fillStyle = EGA[14]
      ctx.fillRect(antennaX, b.y - 12, 2, 2)
    }
  }
  for (let side = 0; side < 2; side++) {
    const p = round.players[side]
    if (!p.alive && !(match.phase === 'explosion' && round.hit === 'player' && round.victim === side)) continue
    const frame = match.phase === 'dance' && match.winner === side ? match.danceBeat % 2 + 1
      : match.phase === 'flight' && round.turn === side && round.shot.time < 0.3 ? side === 0 ? 1 : 2 : 0
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
    const x = round.turn === 0 ? 8 : 440
    drawText(ctx, S.angle, x, 16, 15, 1)
    if (view.prompt === 'velocity') {
      drawText(ctx, view.angle, x + (S.angle.length + 1) * 8, 16, 14, 1)
      drawText(ctx, S.velocity, x, 32, 15, 1)
    }
    const prompt = view.prompt === 'angle' ? S.angle : S.velocity
    drawInput(ctx, input, x / 8 + prompt.length + 2, view.prompt === 'angle' ? 2 : 3, clock, 14)
    if (view.error) {
      const errorX = round.turn === 0 ? 8 : WIDTH - 8 - view.error.length * 8
      drawText(ctx, view.error, errorX, 48, 12, 1)
    }
  }
  if (view.paused) {
    ctx.fillStyle = EGA[0]
    ctx.fillRect(112, 152, 416, 40)
    const message = S.paused(touch)
    drawText(ctx, message, (WIDTH - message.length * 8) / 2, 164, 14)
  }
}
