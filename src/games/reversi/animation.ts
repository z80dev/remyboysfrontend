/** Three visible 250ms pulses, each followed by a 250ms gap. Start only after a hint search completes. */
export function hintPhase(elapsedMs: number): 'on' | 'off' | 'done' {
  if (elapsedMs >= 1500) return 'done'
  return Math.floor(Math.max(0, elapsedMs) / 250) % 2 === 0 ? 'on' : 'off'
}
