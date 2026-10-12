import { clearScreen, drawHalfCells, drawInput, drawSparkles, drawText, EGA, locate, type InputLine } from '../qbasic'
import { bodyCell, CELLS, COLS, DOWN, UP, type Game } from './engine'
import { levelMessage, scoreLine, strings } from './strings'

export type HeadColors = { hair: number; skin: number }
export type Painter = {
  startup: (ctx: CanvasRenderingContext2D) => void
  intro: (ctx: CanvasRenderingContext2D, frame: number, head: HeadColors, touch?: boolean) => void
  setup: (ctx: CanvasRenderingContext2D, prompt: number, answers: readonly string[], input: InputLine, elapsed: number, error: boolean) => void
  game: (ctx: CanvasRenderingContext2D, game: Game, heads: readonly HeadColors[], lore: boolean, touch?: boolean) => void
  dispose: () => void
}

export const SETUP_ROWS = [5, 8, 15, 17] as const

export const SETUP_COLS = [20, 21, 20, 20] as const

/** Display-only contrast on the blue playfield; canonical loaded colours remain unchanged. */
export function displayHeadColor(color: number, part: keyof HeadColors, body: number, monochrome: boolean): number {
  if (monochrome) return part === 'hair' ? 15 : 7
  if (part === 'skin') return color === body ? 15 : color
  return color === 1 || color === 9 ? 11 : color
}


/** Static walls are rasterized once per level/mode; moving snakes use the engine's existing ring buffers. */
export function createPainter(): Painter {
  const background = document.createElement('canvas')
  background.width = 640
  background.height = 400
  const staticContext = background.getContext('2d')!
  const colors = new Uint8Array(CELLS)
  let cachedLevel = -1
  let cachedMono = false
  let cachedWalls: Uint8Array | null = null
  const scores = ['', '']
  const oldScores = [NaN, NaN]
  const oldLives = [NaN, NaN]
  let number = 0
  let digit = ''

  const centered = (ctx: CanvasRenderingContext2D, text: string, row: number, fg = 15, bg = 1) => {
    locate(ctx, row, Math.floor((80 - text.length) / 2) + 1, text, fg, bg)
  }
  const message = (ctx: CanvasRenderingContext2D, lines: readonly string[], mono: boolean) => {
    let width = 24
    for (let i = 0; i < lines.length; i++) width = Math.max(width, lines[i].length + 6)
    const height = lines.length + 2
    const col = Math.floor((80 - width) / 2) + 1
    const row = Math.floor((25 - height) / 2) + 1
    const bg = mono ? 0 : 4
    locate(ctx, row, col, '█' + '▀'.repeat(width - 2) + '█', 15, bg)
    for (let i = 0; i < lines.length; i++) {
      const padding = width - 2 - lines[i].length
      const left = Math.floor(padding / 2)
      locate(ctx, row + i + 1, col, '█' + ' '.repeat(left) + lines[i] + ' '.repeat(padding - left) + '█', 15, bg)
    }
    locate(ctx, row + height - 1, col, '█' + '▄'.repeat(width - 2) + '█', 15, bg)
  }
  const pausedLines = [strings.paused]
  const deathLines = [strings.remyDies]
  const overLines = [strings.gameOver, '', strings.again]
  const loreLines = [strings.gameOver, '', strings.again, '', strings.cabald]
  const bothDeaths = [strings.remyDies, strings.jakeDies]
  const jakeDeath = [strings.jakeDies]
  const pausedTouchLines = [strings.pausedTouch]
  const deathTouchLines = [strings.remyDiesTouch]
  const bothTouchDeaths = [strings.remyDiesTouch, strings.jakeDiesTouch]
  const jakeTouchDeath = [strings.jakeDiesTouch]
  const readyLines = ['']

  return {
    startup(ctx: CanvasRenderingContext2D) {
      clearScreen(ctx)
      locate(ctx, 1, 1, strings.startup, 7, 0)
    },
    intro(ctx: CanvasRenderingContext2D, frame: number, head: HeadColors, touch = false) {
      clearScreen(ctx, 1)
      drawSparkles(ctx, frame)
      centered(ctx, strings.introTitle, 5, 14)
      for (let line = 0; line < strings.introLines.length; line++) centered(ctx, strings.introLines[line], 8 + line)
      centered(ctx, strings.player1, 15, 14)
      centered(ctx, strings.player2, 17, 13)
      centered(ctx, strings.pauseControl, 19)
      centered(ctx, touch ? strings.continueTouch : strings.continue, 23, 14)
      // A short half-block snake beside the controls, rather than a disconnected portrait.
      ctx.fillStyle = EGA[14]
      ctx.fillRect(176, 232, 24, 8)
      ctx.fillRect(176, 232, 8, 16)
      ctx.fillStyle = EGA[displayHeadColor(head.skin, 'skin', 14, false)]
      ctx.fillRect(200, 232, 8, 8)
      ctx.fillStyle = EGA[displayHeadColor(head.hair, 'hair', 14, false)]
      ctx.fillRect(200, 232, 8, 2)
      ctx.fillStyle = EGA[0]
      ctx.fillRect(202, 236, 1, 1)
      ctx.fillRect(205, 236, 1, 1)
    },
    setup(ctx: CanvasRenderingContext2D, prompt: number, answers: readonly string[], input: InputLine, elapsed: number, error: boolean) {
      clearScreen(ctx, 0)
      for (let step = 0; step <= prompt; step++) {
        const row = SETUP_ROWS[step]
        locate(ctx, row, SETUP_COLS[step], strings.prompts[step], 7, 0)
        const col = SETUP_COLS[step] + strings.prompts[step].length + 1
        if (step === prompt) drawInput(ctx, input, col, row, elapsed, 7, 0)
        else locate(ctx, row, col, answers[step], 7, 0)
      }
      if (prompt >= 1) {
        for (let line = 0; line < strings.skillLines.length; line++) locate(ctx, 10 + line, 22, strings.skillLines[line], 7, 0)
      }
      if (error) locate(ctx, 20, 20, strings.invalid[prompt], 15, 0)
    },
    game(ctx: CanvasRenderingContext2D, game: Game, heads: readonly HeadColors[], lore: boolean, touch = false) {
      const mono = game.options.monochrome
      const bg = mono ? 0 : 1
      if (game.level !== cachedLevel || mono !== cachedMono || game.walls !== cachedWalls) {
        for (let i = 0; i < CELLS; i++) colors[i] = game.walls[i] ? (mono ? 7 : 12) : bg
        drawHalfCells(staticContext, colors)
        cachedLevel = game.level
        cachedMono = mono
        cachedWalls = game.walls
      }
      ctx.drawImage(background, 0, 0)
      for (let player = 0; player < game.snakes.length; player++) {
        const snake = game.snakes[player]
        if (snake.score !== oldScores[player] || snake.lives !== oldLives[player]) {
          scores[player] = scoreLine(game, player)
          oldScores[player] = snake.score
          oldLives[player] = snake.lives
        }
        locate(ctx, 1, player === 0 ? 80 - scores[player].length : 2, scores[player], mono ? 15 : (player === 0 ? 14 : 13), bg)
        ctx.fillStyle = EGA[mono ? 15 : (player === 0 ? 14 : 13)]
        for (let depth = 1; depth < snake.size; depth++) {
          const at = bodyCell(snake, depth)
          ctx.fillRect((at % COLS) * 8, Math.floor(at / COLS) * 8, 8, 8)
        }
        const at = bodyCell(snake, 0)
        const x = (at % COLS) * 8
        const y = Math.floor(at / COLS) * 8
        const body = player === 0 ? 14 : 13
        const hair = displayHeadColor(heads[player].hair, 'hair', body, mono)
        const skin = displayHeadColor(heads[player].skin, 'skin', body, mono)
        const neck = snake.size > 1 ? bodyCell(snake, 1) : -1
        const vertical = (snake.direction === UP || snake.direction === DOWN) && Math.abs(neck - at) === COLS
        ctx.fillStyle = EGA[skin]
        if (vertical) {
          const neckY = Math.floor(neck / COLS) * 8
          ctx.fillRect(x, neckY, 8, 8)
          ctx.fillStyle = EGA[hair]
          ctx.fillRect(x, y, 8, 8)
          ctx.fillStyle = EGA[0]
          ctx.fillRect(x + 2, neckY + 3, 1, 1)
          ctx.fillRect(x + 5, neckY + 3, 1, 1)
        } else {
          ctx.fillRect(x, y, 8, 8)
          ctx.fillStyle = EGA[hair]
          ctx.fillRect(x, y, 8, 2)
          ctx.fillStyle = EGA[0]
          ctx.fillRect(x + 2, y + 4, 1, 1)
          ctx.fillRect(x + 5, y + 4, 1, 1)
        }
      }
      if (game.number !== number) {
        number = game.number
        digit = String(number)
      }
      if (game.numberCell >= 0) drawText(ctx, digit, (game.numberCell % COLS) * 8, Math.floor(game.numberCell / COLS) * 8, mono ? 15 : 14, bg)
      if (game.phase === 'paused') message(ctx, touch ? pausedTouchLines : pausedLines, mono)
      else if (game.phase === 'over') message(ctx, lore ? loreLines : overLines, mono)
      else if (game.phase === 'ready') {
        if (game.deaths) message(ctx, touch
          ? game.deaths === 3 ? bothTouchDeaths : game.deaths === 2 ? jakeTouchDeath : deathTouchLines
          : game.deaths === 3 ? bothDeaths : game.deaths === 2 ? jakeDeath : deathLines, mono)
        else {
          readyLines[0] = levelMessage(game.level, touch)
          message(ctx, readyLines, mono)
        }
      }
    },
    dispose() {
      background.width = 0
      background.height = 0
      cachedWalls = null
    },
  }
}
