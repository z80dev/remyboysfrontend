import type { Song } from '../../kit'
import { strings } from '../strings'

/** Original 2-second square-and-marimba cadence; remaining tails stay below three seconds. */
export const fanfare: Song = {
  title: strings.jingle, bpm: 180, stepsPerBeat: 4, beatsPerBar: 4, length: 24, loopStart: 24, room: 0.1,
  parts: [
    { inst: 'square', vol: 0.18, reverb: 0, notes: [[0, 72, 2, 0.6], [3, 76, 2, 0.6], [6, 79, 2, 0.6], [9, 74, 2, 0.5],
      [12, 77, 2, 0.6], [15, 81, 2, 0.6], [18, 79, 5, 0.65]] },
    { inst: 'marimba', vol: 0.2, reverb: 0, notes: [[0, 48, 2, 0.6], [6, 55, 2, 0.6], [12, 53, 2, 0.6],
      [18, 48, 5, 0.6], [18, 64, 5, 0.5], [18, 67, 5, 0.5]] },
  ],
}
