import { getGamesAudio, isGamesMuted, noise, tone } from '../kit'

export type CardSound = 'flick' | 'place' | 'deal' | 'shuffle' | 'flip' | 'invalid' | 'foundation'
const last: Record<CardSound, number> = { flick: -Infinity, place: -Infinity, deal: -Infinity, shuffle: -Infinity, flip: -Infinity, invalid: -Infinity, foundation: -Infinity }

/** Felt-dampened card sounds, scheduled on the kit clock, without timers or a private audio graph. */
export function cardSfx(kind: CardSound): void {
  const audio = getGamesAudio()
  if (!audio || isGamesMuted() || audio.ctx.state !== 'running' || typeof document !== 'undefined' && document.hidden) return
  const now = audio.ctx.currentTime
  if (now - last[kind] < (kind === 'shuffle' ? 0.75 : 0.04)) return
  last[kind] = now
  switch (kind) {
    case 'flick':
      noise(0.03, { freq: 3500, q: 1.5, vol: 0.12, attack: 0.001 })
      break
    case 'deal':
      noise(0.03, { freq: 3500 * (0.94 + Math.random() * 0.12), q: 1.5, vol: 0.1, attack: 0.001 })
      break
    case 'place':
    case 'foundation':
      noise(0.04, { freq: 1200, q: 1.1, vol: 0.14, attack: 0.002 })
      tone(180, 0.04, { type: 'sine', vol: 0.1, attack: 0.002 })
      if (kind === 'foundation') tone(1600, 0.12, { type: 'sine', vol: 0.045, delay: 0.015, attack: 0.001 })
      break
    case 'shuffle':
      // Forty short clicks: intervals shrink throughout a 700 ms riffle; no overlapping long noise tails.
      for (let i = 0; i < 40; i++) {
        const progress = i / 39
        noise(0.008, { freq: 3500 * (0.94 + Math.random() * 0.12), q: 1.5, vol: 0.055,
          delay: 0.692 * (1.5 * progress - 0.5 * progress * progress), attack: 0.001 })
      }
      break
    case 'flip':
      noise(0.03, { freq: 3500, q: 1.5, vol: 0.1, attack: 0.001 })
      noise(0.03, { freq: 3000, q: 1.5, vol: 0.09, delay: 0.045, attack: 0.001 })
      break
    case 'invalid':
      tone(120, 0.08, { type: 'sine', vol: 0.12, attack: 0.001 })
      break
  }
}
