import type { Song } from '../../kit'
import { S } from '../strings'
export const clearJingle: Song = {
  title: S.jingle, bpm: 132, stepsPerBeat: 2, beatsPerBar: 4, length: 8, loopStart: 8, room: 0.1,
  parts: [
    { inst: 'square', vol: 0.16, notes: [[0, 72, 1], [1, 76, 1], [2, 79, 1], [3, 84, 1], [4, 83, 1], [5, 79, 3]] },
    { inst: 'bass', vol: 0.14, notes: [[0, 48, 2], [2, 43, 2], [4, 48, 4]] },
  ],
}
