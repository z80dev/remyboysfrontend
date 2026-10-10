import type { Song } from '../kit'
import { strings as s } from './strings'

export const winJingle: Song = {
  title: s.winJingle, bpm: 100, stepsPerBeat: 4, beatsPerBar: 4, length: 7, loopStart: 0,
  parts: [{ inst: 'square50', vol: 0.1, reverb: 0, echo: 0, notes: [[0, 72, 1, 0.6], [1, 76, 1, 0.6], [2, 79, 1, 0.6], [3, 84, 3, 0.6]] }],
}
export const lossJingle: Song = {
  title: s.lossJingle, bpm: 90, stepsPerBeat: 4, beatsPerBar: 4, length: 8, loopStart: 0,
  parts: [{ inst: 'ocarina', vol: 0.1, reverb: 0, echo: 0, notes: [[0, 67, 1, 0.6], [2, 63, 1, 0.6], [4, 60, 3, 0.6]] }],
}
export const tieJingle: Song = {
  title: s.tieJingle, bpm: 100, stepsPerBeat: 4, beatsPerBar: 4, length: 6, loopStart: 0,
  parts: [{ inst: 'ocarina', vol: 0.1, reverb: 0, echo: 0, notes: [[0, 72, 1, 0.6], [1, 76, 1, 0.6], [2, 72, 3, 0.6]] }],
}
