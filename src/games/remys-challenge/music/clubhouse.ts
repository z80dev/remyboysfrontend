import type { Song } from '../../kit'
import { DRUM } from '../../../quest/music/song'
import { everyBar, line, MAJ, MIN } from './notes'

// C major, bouncy: C Am F G | C Am Dm G
const ROOTS = [36, 33, 41, 43, 36, 33, 38, 43]
const QUAL = [MAJ, MIN, MAJ, MAJ, MAJ, MIN, MIN, MAJ]

const melody = line([
  [72, 2], [76, 2], [79, 2], [76, 2], [77, 2], [76, 2], [72, 4],
  [69, 2], [72, 2], [76, 4], [74, 2], [72, 2], [69, 4],
  [65, 2], [69, 2], [72, 2], [77, 2], [76, 2], [74, 2], [72, 2], [69, 2],
  [71, 4], [74, 2], [79, 6], [0, 4],
  [79, 2], [77, 2], [76, 2], [77, 2], [79, 4], [72, 4],
  [76, 2], [74, 2], [72, 2], [74, 2], [76, 4], [69, 4],
  [74, 2], [77, 2], [81, 2], [77, 2], [76, 2], [74, 2], [72, 2], [71, 2],
  [74, 2], [71, 2], [67, 2], [71, 2], [74, 4], [0, 4]
])

export const clubhouseTheme: Song = {
  title: 'Clubhouse Theme',
  bpm: 132,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: 128,
  loopStart: 0,
  swing: 0.08,
  room: 0.25,
  echoBeats: 0.75,
  echoFeedback: 0.2,
  parts: [
    { inst: 'square', notes: melody, vol: 0.55, pan: 0.1, echo: 0.15 },
    {
      inst: 'bass_finger', vol: 0.7,
      notes: everyBar(8, 16, b => {
        const r = ROOTS[b]
        return [[0, r, 2, 0.9], [3, r, 1, 0.6], [4, r + 7, 2, 0.75], [8, r + 12, 2, 0.8], [10, r + 7, 2, 0.65], [12, r, 2, 0.8], [14, r + 7, 2, 0.65]]
      })
    },
    {
      inst: 'square50', vol: 0.22, pan: -0.3,
      notes: everyBar(8, 16, b => {
        const out: [number, number, number, number][] = []
        for (const s of [2, 6, 10, 14]) for (const t of QUAL[b]) out.push([s, ROOTS[b] + 24 + t, 1, 0.5])
        return out
      })
    },
    {
      inst: 'drums', vol: 0.5,
      notes: everyBar(8, 16, b => {
        const out: [number, number, number, number][] = [[0, DRUM.kick, 1, 0.9], [8, DRUM.kick, 1, 0.8], [4, DRUM.snare, 1, 0.7], [12, DRUM.snare, 1, 0.7]]
        for (let s = 0; s < 16; s += 2) out.push([s, DRUM.hatClosed, 1, s % 4 ? 0.35 : 0.5])
        if (b === 7) out.push([14, DRUM.tomHigh, 1, 0.6], [15, DRUM.tomMid, 1, 0.6])
        return out
      })
    }
  ]
}
