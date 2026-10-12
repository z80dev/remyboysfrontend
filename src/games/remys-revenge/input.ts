/** Travelling swipes emit once. Only a stationary hold repeats, after a keyboard-style initial delay. */
export type Swipe = {
  id: number
  x: number
  y: number
  lastX: number
  lastY: number
  direction: number
  elapsed: number
  moved: boolean
  repeating: boolean
}
const keys: Record<string, number> = {
  ArrowUp: 0, ArrowRight: 2, ArrowDown: 4, ArrowLeft: 6, Home: 7, PageUp: 1, End: 5, PageDown: 3,
  q: 7, e: 1, z: 5, c: 3, '7': 7, '8': 0, '9': 1, '4': 6, '6': 2, '1': 5, '2': 4, '3': 3,
}
export function directionForKey(key: string): number | undefined { return keys[key] ?? keys[key.toLowerCase()] }
export type HeldKeys = { pressed: Map<string, number>; order: number; direction: number }
export function createHeldKeys(): HeldKeys { return { pressed: new Map(), order: 0, direction: -1 } }
/** Event-time ordering restores an older physically held direction after a newer key is released. */
export function pressKey(held: HeldKeys, key: string): number | undefined {
  const direction = directionForKey(key)
  if (direction === undefined) return undefined
  held.pressed.set(key.toLowerCase(), ++held.order * 8 + direction)
  held.direction = direction
  return direction
}
export function releaseKey(held: HeldKeys, key: string): number {
  if (!held.pressed.delete(key.toLowerCase())) return held.direction
  let latest = -1
  for (const entry of held.pressed.values()) if (entry > latest) latest = entry
  held.direction = latest < 0 ? -1 : latest % 8
  return held.direction
}
export function clearHeldKeys(held: HeldKeys): void {
  held.pressed.clear()
  held.order = 0
  held.direction = -1
}
export function beginSwipe(swipe: Swipe, pointer: number, x: number, y: number): void {
  swipe.id = pointer
  swipe.x = swipe.lastX = x
  swipe.y = swipe.lastY = y
  swipe.direction = -1
  swipe.elapsed = 0
  swipe.moved = false
  swipe.repeating = false
}
export function updateSwipe(swipe: Swipe, pointer: number, x: number, y: number): number {
  if (pointer !== swipe.id) return -1
  if (Math.hypot(x - swipe.lastX, y - swipe.lastY) >= 3) {
    swipe.lastX = x
    swipe.lastY = y
    swipe.elapsed = 0
    swipe.repeating = false
  }
  const dx = x - swipe.x
  const dy = y - swipe.y
  if (Math.hypot(dx, dy) < 12) return -1
  swipe.direction = (Math.round(Math.atan2(dx, -dy) / (Math.PI / 4)) + 8) % 8
  if (swipe.moved) return -1
  swipe.moved = true
  swipe.elapsed = 0
  return swipe.direction
}
export function repeatDirection(swipe: Swipe, held: number, milliseconds: number): number {
  const direction = held >= 0 ? held : swipe.direction
  if (direction < 0) return -1
  swipe.elapsed += milliseconds
  const delay = swipe.repeating ? 150 : 375
  if (swipe.elapsed < delay) return -1
  swipe.elapsed -= delay
  swipe.repeating = true
  return direction
}
