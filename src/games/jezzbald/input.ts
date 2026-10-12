import { CELL, COLS, HEIGHT, ROWS, WIDTH, startWall, type Game, type Orientation } from './engine'

export type Cursor = { x: number, y: number, px: number, py: number, orientation: Orientation, visible: boolean }

/** The arrow's central pixel is its hotspot; only build coordinates snap to the grid. */
export function pointCursor(cursor: Cursor, x: number, y: number, width: number, height: number): void {
  cursor.px = Math.max(0, Math.min(WIDTH - 1, x * WIDTH / width))
  cursor.py = Math.max(0, Math.min(HEIGHT - 1, y * HEIGHT / height))
  cursor.x = Math.floor(cursor.px / CELL)
  cursor.y = Math.floor(cursor.py / CELL)
}

export function moveCursor(cursor: Cursor, dx: number, dy: number): void {
  cursor.x = Math.max(0, Math.min(COLS - 1, cursor.x + dx))
  cursor.y = Math.max(0, Math.min(ROWS - 1, cursor.y + dy))
  cursor.px = cursor.x * CELL + CELL / 2
  cursor.py = cursor.y * CELL + CELL / 2
  cursor.visible = true
}

/** A rejected long press has no orientation side effect. Commit the gesture only after the engine accepts it. */
export function longPressWall(game: Game, cursor: Cursor): boolean {
  const orientation = cursor.orientation === 'horizontal' ? 'vertical' : 'horizontal'
  if (!startWall(game, cursor.x, cursor.y, orientation)) return false
  cursor.orientation = orientation
  return true
}

/** Randomness belongs to new UI runs, never the deterministic engine or a level transition. */
export function newRunSeed(): number {
  const seed = new Uint32Array(1)
  crypto.getRandomValues(seed)
  return seed[0]
}
