import { glyph } from './font'

export const EGA = ['#000000', '#0000aa', '#00aa00', '#00aaaa', '#aa0000', '#aa00aa', '#aa5500', '#aaaaaa',
  '#555555', '#5555ff', '#55ff55', '#55ffff', '#ff5555', '#ff55ff', '#ffff55', '#ffffff'] as const
export const CELL_W = 8
export const CELL_H = 16
export const TEXT_W = 640
export const TEXT_H = 400
export const GRAPHICS_H = 350

export function clearScreen(ctx: CanvasRenderingContext2D, bg = 0, width = TEXT_W, height = TEXT_H): void {
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = EGA[bg & 15]
  ctx.fillRect(0, 0, width, height)
}

/** Draw at pixel coordinates, not LOCATE cells. All coordinates are snapped to integer pixels. */
export function drawChar(ctx: CanvasRenderingContext2D, char: string, x: number, y: number, fg = 15, bg?: number): void {
  x = Math.round(x)
  y = Math.round(y)
  if (bg !== undefined) {
    ctx.fillStyle = EGA[bg & 15]
    ctx.fillRect(x, y, 8, 16)
  }
  ctx.fillStyle = EGA[fg & 15]
  const rows = glyph(char)
  for (let row = 0; row < 16; row++) {
    let col = 0
    while (col < 8) {
      if (!(rows[row] & (128 >> col))) { col++; continue }
      const start = col++
      while (col < 8 && (rows[row] & (128 >> col))) col++
      ctx.fillRect(x + start, y + row, col - start, 1)
    }
  }
}

export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fg = 15, bg?: number): void {
  const left = x
  for (const char of text) {
    if (char === '\n') { x = left; y += 16; continue }
    drawChar(ctx, char, x, y, fg, bg)
    x += 8
  }
}

/** QBasic LOCATE uses 1-based rows and columns. */
export function locate(ctx: CanvasRenderingContext2D, row: number, col: number, text: string, fg = 15, bg?: number): void {
  drawText(ctx, text, (col - 1) * 8, (row - 1) * 16, fg, bg)
}

export function drawBox(ctx: CanvasRenderingContext2D, col: number, row: number, width: number, height: number, fg = 15, bg = 4): void {
  for (let r = 0; r < height; r++) {
    const line = r === 0 ? '╔' + '═'.repeat(width - 2) + '╗'
      : r === height - 1 ? '╚' + '═'.repeat(width - 2) + '╝' : '║' + ' '.repeat(width - 2) + '║'
    locate(ctx, row + r, col, line, fg, bg)
  }
}

/** A full 80×50 logical colour buffer. Half-block rows preserve 8×16 text-mode geometry. */
export function drawHalfCells(ctx: CanvasRenderingContext2D, cells: ArrayLike<number>): void {
  for (let row = 0; row < 25; row++) {
    for (let col = 0; col < 80; col++) {
      const top = cells[(row * 2) * 80 + col] & 15
      const bottom = cells[(row * 2 + 1) * 80 + col] & 15
      ctx.fillStyle = EGA[top]
      ctx.fillRect(col * 8, row * 16, 8, 8)
      ctx.fillStyle = EGA[bottom]
      ctx.fillRect(col * 8, row * 16 + 8, 8, 8)
    }
  }
}

export function drawSparkles(ctx: CanvasRenderingContext2D, frame: number, rows = 25, fg = 14, bg = 1, spacing = 4): void {
  const perimeter = 2 * 80 + 2 * (rows - 2)
  for (let i = 0; i < perimeter; i++) {
    let col: number, row: number
    if (i < 80) { col = i; row = 0 }
    else if (i < 80 + rows - 2) { col = 79; row = i - 79 }
    else if (i < 160 + rows - 2) { col = 159 + rows - 2 - i; row = rows - 1 }
    else { col = 0; row = perimeter - i }
    drawChar(ctx, (i + frame) % spacing === 0 ? '*' : ' ', col * 8, row * 16, fg, bg)
  }
}

/** Cursor is 16 on / 16 off at the DOS 60 Hz display cadence. */
export function cursorVisible(elapsedMs: number): boolean {
  return Math.floor(elapsedMs * 60 / 1000) % 32 < 16
}

export type InputLine = { value: string; maxLength: number }
export type InputEdit = { input: InputLine; submitted: boolean; cancelled: boolean; handled: boolean }
export function createInput(maxLength = 32, value = ''): InputLine {
  return { value: value.slice(0, maxLength), maxLength }
}

export function editInput(input: InputLine, key: string, allow?: RegExp): InputEdit {
  let value = input.value
  const submitted = key === 'Enter'
  const cancelled = key === 'Escape'
  let handled = submitted || cancelled || key === 'Backspace'
  if (key === 'Backspace') value = value.slice(0, -1)
  else if (key.length === 1 && key >= ' ' && key <= '~' && (!allow || allow.test(key))) {
    value = (value + key).slice(0, input.maxLength)
    handled = true
  }
  return { input: value === input.value ? input : { ...input, value }, submitted, cancelled, handled }
}

export function drawInput(ctx: CanvasRenderingContext2D, input: InputLine, col: number, row: number, elapsedMs: number, fg = 15, bg = 1): void {
  locate(ctx, row, col, input.value + (cursorVisible(elapsedMs) ? '_' : ' '), fg, bg)
}

export function nearestEga(hex: string): number {
  const value = Number.parseInt(hex.replace('#', ''), 16)
  let best = 0, distance = Infinity
  for (let i = 0; i < EGA.length; i++) {
    const color = Number.parseInt(EGA[i].slice(1), 16)
    const dr = (value >> 16) - (color >> 16)
    const dg = ((value >> 8) & 255) - ((color >> 8) & 255)
    const db = (value & 255) - (color & 255)
    const d = dr * dr + dg * dg + db * db
    if (d < distance) { distance = d; best = i }
  }
  return best
}

/** Preserve a portrait's colour family when the sparse EGA palette would otherwise flatten it into grey. */
export function nearestEgaChromatic(hex: string): number {
  const value = Number.parseInt(hex.replace('#', ''), 16)
  const r = (value >> 16) / 255
  const g = ((value >> 8) & 255) / 255
  const b = (value & 255) / 255
  const maximum = Math.max(r, g, b)
  const minimum = Math.min(r, g, b)
  const range = maximum - minimum
  const light = (maximum + minimum) / 2
  const saturation = range === 0 ? 0 : range / (1 - Math.abs(2 * light - 1))
  if (saturation <= 0.15) return nearestEga(hex)
  let hue = maximum === r ? (g - b) / range : maximum === g ? 2 + (b - r) / range : 4 + (r - g) / range
  hue = (hue * 60 + 360) % 360
  let best = 1, distance = Infinity
  for (let i = 1; i < 15; i++) {
    if (i === 7 || i === 8) continue
    const color = Number.parseInt(EGA[i].slice(1), 16)
    const cr = (color >> 16) / 255
    const cg = ((color >> 8) & 255) / 255
    const cb = (color & 255) / 255
    const max = Math.max(cr, cg, cb)
    const min = Math.min(cr, cg, cb)
    const delta = max - min
    let ch = max === cr ? (cg - cb) / delta : max === cg ? 2 + (cb - cr) / delta : 4 + (cr - cg) / delta
    ch = (ch * 60 + 360) % 360
    const difference = Math.abs(hue - ch)
    const hueDistance = Math.min(difference, 360 - difference) / 180
    const lightDistance = light - (max + min) / 2
    const d = hueDistance * hueDistance * 4 + lightDistance * lightDistance
    if (d < distance) { distance = d; best = i }
  }
  return best
}

export type EgaRemyPalette = { skin: number; hair: number; shirt: number }

/** Skin tones and dark/bright contrast remain readable at two-pixel sprite resolution. */
export function quantizeRemyPalette(palette: { skin: string; hair: string; shirt: string }): EgaRemyPalette {
  const skinRgb = Number.parseInt(palette.skin.replace('#', ''), 16)
  const light = ((skinRgb >> 16) * 0.2126 + ((skinRgb >> 8) & 255) * 0.7152 + (skinRgb & 255) * 0.0722) / 255
  const skin = light >= 0.62 ? 14 : light >= 0.38 ? 12 : 6
  let hair = nearestEgaChromatic(palette.hair)
  let shirt = nearestEgaChromatic(palette.shirt)
  if (hair === skin) hair = hair >= 8 ? hair - 8 : hair + 8
  if (shirt === skin) shirt = shirt >= 8 ? shirt - 8 : shirt + 8
  return { skin, hair, shirt }
}
