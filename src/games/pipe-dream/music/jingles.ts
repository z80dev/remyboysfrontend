import type { Song } from '../../kit'
import { strings } from '../strings'

export const passJingle: Song = {
  title: strings.pass, bpm: 180, stepsPerBeat: 2, beatsPerBar: 4, length: 8, loopStart: 0, room: .2,
  parts: [{ inst: 'bell', vol: .35, reverb: .1, notes: [[0, 72, 1, .65], [1, 76, 1, .65], [2, 79, 1, .65], [3, 84, 4, .7]] }]
}
export const failJingle: Song = {
  title: strings.fail, bpm: 180, stepsPerBeat: 2, beatsPerBar: 4, length: 8, loopStart: 0, room: .15,
  parts: [{ inst: 'ocarina', vol: .35, reverb: .1, notes: [[0, 67, 2, .7], [2, 63, 2, .7], [4, 60, 3, .7]] }]
}
