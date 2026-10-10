import { chord, noise, playJingle, sweep, tone } from '../kit'
import type { Piece, PipeGame } from './engine'
import { failJingle, passJingle } from './music/jingles'

export const AUDIO_OWNER = 'pipe-dream'
export function playEvents(game: PipeGame, last: Record<string, number>, now: number, placedPiece?: Piece) {
  for (const event of game.events) {
    if (now - (last[event] ?? -Infinity) < 40) continue
    last[event] = now
    if (event === 'place') {
      const piece = placedPiece
      const frequency = piece === 'cross' ? 262 : piece === 'horizontal' || piece === 'vertical' ? 330 : 392
      tone(frequency, .07, { type: 'triangle', vol: .12, owner: AUDIO_OWNER })
      noise(.025, { freq: 3000, vol: .045, owner: AUDIO_OWNER })
    } else if (event === 'replace') {
      noise(.16, { freq: 420, vol: .13, owner: AUDIO_OWNER })
      sweep(160, 65, .15, { type: 'triangle', vol: .08, owner: AUDIO_OWNER })
    } else if (event === 'slide') tone(480, .045, { type: 'triangle', vol: .08, owner: AUDIO_OWNER })
    else if (event === 'section') {
      const pitch = 180 * 2 ** (Math.min(12, game.length) / 12)
      sweep(pitch, pitch / 2, .08, { type: 'sine', vol: .11, owner: AUDIO_OWNER })
    } else if (event === 'cross') {
      tone(1568, .17, { type: 'sine', vol: .09, owner: AUDIO_OWNER })
      tone(2093, .2, { type: 'sine', vol: .06, owner: AUDIO_OWNER })
    } else if (event === 'reservoir') noise(.3, { filter: 'lowpass', freq: 1100, to: 350, vol: .1, attack: .04, owner: AUDIO_OWNER })
    else if (event === 'distance') chord([60, 64, 67], .35, { type: 'triangle', vol: .18, owner: AUDIO_OWNER })
    else if (event === 'pass' || event === 'bonus') void playJingle(passJingle, AUDIO_OWNER)
    else if (event === 'fail') {
      sweep(170, 80, .15, { type: 'sine', vol: .1, owner: AUDIO_OWNER })
      void playJingle(failJingle, AUDIO_OWNER)
    }
  }
}
