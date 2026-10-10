import type { Song } from '../../kit'
import { DRUM } from '../../../quest/music/song'
import { everyBar, line, MAJ, MIN } from './notes'

// A minor, driving: Am Am F G | Am Am E E
const ROOTS = [33, 33, 29, 31, 33, 33, 28, 28]
const QUAL = [MIN, MIN, MAJ, MAJ, MIN, MIN, MAJ, MAJ]

const melody = line([
  [69, 3], [72, 3], [76, 2], [74, 2], [72, 2], [71, 2], [72, 2],
  [69, 6], [0, 2], [64, 2], [67, 2], [69, 4],
  [72, 3], [77, 3], [76, 2], [74, 2], [72, 2], [74, 4],
  [71, 3], [74, 3], [79, 2], [77, 2], [74, 2], [71, 4],
  [81, 3], [79, 3], [76, 2], [77, 2], [76, 2], [72, 4],
  [74, 2], [72, 2], [71, 2], [72, 2], [69, 8],
  [68, 3], [71, 3], [74, 2], [76, 4], [80, 4],
  [83, 6], [81, 2], [80, 4], [76, 4]
])

export const canyonChase: Song = {
  title: 'Canyon Chase',
  bpm: 152,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: 128,
  loopStart: 0,
  room: 0.3,
  echoBeats: 0.75,
  echoFeedback: 0.25,
  parts: [
    { inst: 'saw_lead', notes: melody, vol: 0.45, pan: 0.15, echo: 0.2 },
    {
      inst: 'bass', vol: 0.6,
      notes: everyBar(8, 16, b => {
        const r = ROOTS[b]
        const out: [number, number, number, number][] = []
        for (let s = 0; s < 16; s += 2) out.push([s, s % 4 === 2 ? r + 12 : r, 2, s % 8 ? 0.65 : 0.9])
        return out
      })
    },
    {
      inst: 'strings_stacc', vol: 0.3, pan: -0.25,
      notes: everyBar(8, 16, b => {
        const out: [number, number, number, number][] = []
        for (const s of [0, 3, 6, 10]) for (const t of QUAL[b]) out.push([s, ROOTS[b] + 24 + t, 2, s ? 0.55 : 0.7])
        return out
      })
    },
    {
      inst: 'drums', vol: 0.55,
      notes: everyBar(8, 16, b => {
        const out: [number, number, number, number][] = [[0, DRUM.kick, 1, 0.95], [3, DRUM.kick, 1, 0.7], [6, DRUM.kick, 1, 0.75], [8, DRUM.kick, 1, 0.85], [11, DRUM.kick, 1, 0.7], [4, DRUM.snare, 1, 0.8], [12, DRUM.snare, 1, 0.8]]
        for (let s = 0; s < 16; s++) out.push([s, DRUM.hatClosed, 1, s % 2 ? 0.2 : 0.4])
        if (b === 0) out.push([0, DRUM.crash, 4, 0.5])
        if (b === 7) out.push([12, DRUM.tomHigh, 1, 0.7], [13, DRUM.tomMid, 1, 0.7], [14, DRUM.tomLow, 1, 0.7], [15, DRUM.tomLow, 1, 0.8])
        return out
      })
    }
  ]
}
