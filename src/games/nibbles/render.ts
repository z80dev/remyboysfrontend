import { clearScreen, drawBox, drawChar, drawHalfCells, drawInput, drawSparkles, drawText, EGA, locate, type InputLine } from '../qbasic'
import { bodyCell, CELLS, COLS, type Game } from './engine'
import { levelMessage, scoreLine, strings } from './strings'

export type HeadColors = { hair: number; skin: number }
export type Painter = {
  startup: (ctx: CanvasRenderingContext2D) => void
  intro: (ctx: CanvasRenderingContext2D, frame: number, head: HeadColors) => void
  setup: (ctx: CanvasRenderingContext2D, prompt: number, input: InputLine, elapsed: number, error: boolean) => void
  game: (ctx: CanvasRenderingContext2D, game: Game, heads: readonly HeadColors[], lore: boolean) => void
  dispose: () => void
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
    const height = lines.length + 4
    const col = Math.floor((80 - width) / 2) + 1
    const row = Math.floor((25 - height) / 2) + 1
    const bg = mono ? 0 : 4
    drawBox(ctx, col, row, width, height, 15, bg)
    // SpacePause's solid half-block frame, rather than a modern dialog border.
    for (let i = 0; i < width; i++) {
      drawChar(ctx, '▄', (col + i - 1) * 8, (row - 1) * 16, 15, bg)
      drawChar(ctx, '▀', (col + i - 1) * 8, (row + height - 2) * 16, 15, bg)
    }
    for (let i = 1; i < height - 1; i++) {
      locate(ctx, row + i, col, '█', 15, bg)
      locate(ctx, row + i, col + width - 1, '█', 15, bg)
    }
    for (let i = 0; i < lines.length; i++) {
      locate(ctx, row + i + 2, col + Math.floor((width - lines[i].length) / 2), lines[i], 15, bg)
    }
  }
  const pausedLines = [strings.paused]
  const deathLines = [strings.remyDies]
  const overLines = [strings.gameOver, strings.again]
  const loreLines = [strings.gameOver, strings.again, strings.cabald]
  const bothDeaths = [strings.remyDies, strings.jakeDies]
  const jakeDeath = [strings.jakeDies]
  const readyLines = ['']

  return {
    startup(ctx: CanvasRenderingContext2D) {
      clearScreen(ctx)
      locate(ctx, 1, 1, strings.startup, 7, 0)
    },
    intro(ctx: CanvasRenderingContext2D, frame: number, head: HeadColors) {
      clearScreen(ctx, 1)
      drawSparkles(ctx, frame)
      centered(ctx, strings.introTitle, 5, 14)
      for (let line = 0; line < strings.introLines.length; line++) locate(ctx, 8 + line, 9, strings.introLines[line], 15, 1)
      centered(ctx, strings.player1, 15, 14)
      centered(ctx, strings.player2, 17, 13)
      centered(ctx, strings.pauseControl, 19)
      centered(ctx, strings.continue, 23, 14)
      ctx.fillStyle = EGA[head.hair]
      ctx.fillRect(312, 96, 16, 6)
      ctx.fillStyle = EGA[head.skin]
      ctx.fillRect(314, 102, 12, 10)
      ctx.fillStyle = EGA[0]
      ctx.fillRect(317, 105, 2, 2)
      ctx.fillRect(323, 105, 2, 2)
      ctx.fillRect(319, 110, 4, 1)
    },
    setup(ctx: CanvasRenderingContext2D, prompt: number, input: InputLine, elapsed: number, error: boolean) {
      clearScreen(ctx, 0)
      locate(ctx, 3, 3, strings.introTitle, 7, 0)
      locate(ctx, 7, 3, strings.prompts[prompt], 7, 0)
      drawInput(ctx, input, strings.prompts[prompt].length + 5, 7, elapsed, 7, 0)
      if (prompt === 1) {
        for (let line = 0; line < strings.skillLines.length; line++) locate(ctx, 10 + line, 3, strings.skillLines[line], 7, 0)
      }
      if (error) locate(ctx, 17, 3, strings.invalid[prompt], 15, 0)
    },
    game(ctx: CanvasRenderingContext2D, game: Game, heads: readonly HeadColors[], lore: boolean) {
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
        drawChar(ctx, '▀', x, y, mono ? 15 : heads[player].hair, mono ? 7 : heads[player].skin)
        ctx.fillStyle = EGA[0]
        ctx.fillRect(x + 2, y + 10, 1, 1)
        ctx.fillRect(x + 5, y + 10, 1, 1)
      }
      if (game.number !== number) {
        number = game.number
        digit = String(number)
      }
      if (game.numberCell >= 0) drawText(ctx, digit, (game.numberCell % COLS) * 8, Math.floor(game.numberCell / COLS) * 8, mono ? 15 : 14, bg)
      if (game.phase === 'paused') message(ctx, pausedLines, mono)
      else if (game.phase === 'over') message(ctx, lore ? loreLines : overLines, mono)
      else if (game.phase === 'ready') {
        if (game.deaths) message(ctx, game.deaths === 3 ? bothDeaths : game.deaths === 2 ? jakeDeath : deathLines, mono)
        else {
          readyLines[0] = levelMessage(game.level)
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
