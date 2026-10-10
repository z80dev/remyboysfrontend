/** Fixed 60 Hz XP cascade. The caller never clears its trail surface between steps.
 * Mutable numeric state avoids per-frame allocations and survives hidden-window pauses. */
export type Cascade = { index: number; x: number; y: number; vx: number; vy: number; elapsed: number; done: boolean }
export const CASCADE_SUITS = [3, 0, 1, 2] as const
export function launchCascade(s: Cascade, width: number, random: () => number) {
  s.x = Math.max(11, (width - 563) / 2) + (CASCADE_SUITS[s.index % 4] + 3) * 82
  s.y = 11
  s.vx = (random() < .5 ? -1 : 1) * (2 + random() * 4)
  s.vy = -2 - random() * 4
}
export function createCascade(width: number, random = Math.random): Cascade {
  const s = { index: 0, x: 0, y: 0, vx: 0, vy: 0, elapsed: 0, done: false }
  launchCascade(s, width, random)
  return s
}
/** Returns true only on a bounce, leaving sound throttling to the UI. */
export function stepCascade(s: Cascade, width: number, height: number, random = Math.random): boolean {
  if (s.done) return false
  s.elapsed += 1000 / 60
  s.x += s.vx
  s.vy += .6
  s.y += s.vy
  let bounced = false
  if (s.y + 96 >= height && s.vy > 0) {
    s.y = height - 96
    s.vy = -s.vy * .75 * (.7 + random() * .15)
    bounced = true
  }
  if (s.x > width || s.x + 71 < 0) {
    s.index++
    s.done = s.index === 52
    if (!s.done) launchCascade(s, width, random)
  }
  return bounced
}
