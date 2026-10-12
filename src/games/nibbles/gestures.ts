import { DOWN, LEFT, queueTurn, RIGHT, UP, type Game } from './engine'

export type Gesture = { id: number; x: number; y: number; player: number }

export function touchForInput(previous: boolean, input: string, pocket: boolean): boolean {
  return pocket || (input === 'touch' ? true : input === 'mouse' || input === 'keyboard' ? false : previous)
}

/** Text-screen transitions happen on click, never while a new form can appear under a pressed finger. */
export function clickContinues(screen: string): boolean {
  return screen === 'startup' || screen === 'intro'
}

/** An explicit pointer action may continue a round, then steer with that same pointer. */
export function beginGesture(game: Game, gestures: Gesture[], id: number, x: number, y: number, midpoint: number, proceed: () => void): boolean {
  if (game.phase === 'over') return false
  if (game.phase !== 'playing') proceed()
  if (game.phase !== 'playing') return false
  for (const gesture of gestures) {
    if (gesture.id !== -1) continue
    gesture.id = id
    gesture.x = x
    gesture.y = y
    gesture.player = game.options.players === 2 && x < midpoint ? 1 : 0
    return true
  }
  return false
}

export function moveGesture(game: Game, gestures: Gesture[], id: number, x: number, y: number): boolean {
  if (game.phase !== 'playing') return false
  for (const gesture of gestures) {
    if (gesture.id !== id) continue
    const dx = x - gesture.x
    const dy = y - gesture.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return false
    const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? RIGHT : LEFT) : (dy > 0 ? DOWN : UP)
    queueTurn(game, gesture.player, direction)
    gesture.x = x
    gesture.y = y
    return true
  }
  return false
}
