/**
 * Time of day, driven by the player's real local clock. The overworld grades its palette, switches lamps and lit
 * windows on and lets the lighting pass carve light pools out of the dark from these values.
 *
 * Dev builds accept an override (`?hour=21.5` in the URL, `localStorage['remyquest.hour']`, or `setHourOverride`)
 * so every mood can be previewed without waiting for the sun.
 */

export type Phase = 'morning' | 'day' | 'golden' | 'night'

export const sky = {
  /** Local hour, fractional (0 ≤ hour < 24). */
  hour: 12,
  phase: 'day' as Phase,
  /** Darkness: 0 broad daylight → 1 deep night. */
  night: 0,
  /** Golden-hour warmth, 0..1 (peaks just before sunset). */
  warm: 0,
  /** Pink dawn haze, 0..1. */
  dawn: 0,
  /** Artificial lights (street lamps, windows, neon): 0 off → 1 fully on. */
  lamps: 0,
}

/** [hour, night, warm, dawn] keyframes; linear in between, wrapping at midnight. */
const KEYS: readonly (readonly [number, number, number, number])[] = [
  [0, 1, 0, 0],
  [4.5, 1, 0, 0],
  [5.5, 0.75, 0, 0.6],
  [6.5, 0.3, 0, 1],
  [7.5, 0, 0, 0.45],
  [9, 0, 0, 0],
  [16, 0, 0, 0],
  [17.5, 0, 0.75, 0],
  [18.5, 0.12, 1, 0],
  [19.4, 0.5, 0.7, 0],
  [20.4, 0.9, 0.15, 0],
  [21, 1, 0, 0],
  [24, 1, 0, 0],
]

let override: number | null = null
if (import.meta.env.DEV) {
  const q = new URLSearchParams(location.search).get('hour') ?? localStorage.getItem('remyquest.hour')
  if (q !== null && q !== '' && Number.isFinite(Number(q))) override = Number(q)
}

/** Dev-only: pin the clock to `hour` (null = follow the real clock again). */
export function setHourOverride(hour: number | null): void {
  if (!import.meta.env.DEV) return
  override = hour === null ? null : ((hour % 24) + 24) % 24
  lastCheck = -1
  updateSky(performance.now())
}

let lastCheck = -1
/** Cheap to call every frame: the clock is only read a few times a second. */
export function updateSky(now: number): void {
  if (lastCheck >= 0 && now - lastCheck < 500) return
  lastCheck = now
  let h: number
  if (override !== null) h = override
  else {
    const d = new Date()
    h = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600
  }
  sky.hour = h
  let i = 0
  while (i < KEYS.length - 2 && KEYS[i + 1][0] <= h) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const t = b[0] === a[0] ? 0 : (h - a[0]) / (b[0] - a[0])
  sky.night = a[1] + (b[1] - a[1]) * t
  sky.warm = a[2] + (b[2] - a[2]) * t
  sky.dawn = a[3] + (b[3] - a[3]) * t
  sky.lamps = Math.max(0, Math.min(1, (sky.night - 0.2) / 0.35))
  sky.phase = sky.night >= 0.6 ? 'night' : sky.warm > 0.3 ? 'golden' : h < 10 ? 'morning' : 'day'
}

updateSky(0)
