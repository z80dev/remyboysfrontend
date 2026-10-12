import type { Song } from '../../kit'
import { DRUM } from '../../../quest/music/song'
import { everyBar, line, MAJ, MIN, voiced } from './notes'

// A minor, driving, 32 bars:
// A  Am Am F G | Am Am E E     (original chase theme)
// B  F G C Am | Dm F E E       (broad half-time answer, lifts to the relative major)
// A' Am Am F G | Dm Dm E Am    (theme returns, cadences on the tonic)
// B' F G C Am | Dm F E E       (answer pushed up an octave; E major dominant loops back to Am)
const ROOTS = [
  33, 33, 29, 31, 33, 33, 28, 28,
  29, 31, 36, 33, 38, 29, 28, 28,
  33, 33, 29, 31, 38, 38, 28, 33,
  29, 31, 36, 33, 38, 29, 28, 28
]
const QUAL = [
  MIN, MIN, MAJ, MAJ, MIN, MIN, MAJ, MAJ,
  MAJ, MAJ, MAJ, MIN, MIN, MAJ, MAJ, MAJ,
  MIN, MIN, MAJ, MAJ, MIN, MIN, MAJ, MIN,
  MAJ, MAJ, MAJ, MIN, MIN, MAJ, MAJ, MAJ
]

const THEME_HEAD: [number, number][] = [
  [69, 3], [72, 3], [76, 2], [74, 2], [72, 2], [71, 2], [72, 2],
  [69, 6], [0, 2], [64, 2], [67, 2], [69, 4],
  [72, 3], [77, 3], [76, 2], [74, 2], [72, 2], [74, 4],
  [71, 3], [74, 3], [79, 2], [77, 2], [74, 2], [71, 4]
]

const melody = line([
  // A
  ...THEME_HEAD,
  [81, 3], [79, 3], [76, 2], [77, 2], [76, 2], [72, 4],
  [74, 2], [72, 2], [71, 2], [72, 2], [69, 8],
  [68, 3], [71, 3], [74, 2], [76, 4], [80, 4],
  [83, 6], [81, 2], [80, 4], [76, 4],
  // B
  [72, 8], [77, 4], [76, 4],
  [74, 8], [71, 4], [67, 4],
  [72, 4], [76, 4], [79, 8],
  [76, 4], [72, 4], [69, 8],
  [74, 3], [77, 3], [81, 2], [79, 4], [77, 4],
  [76, 3], [77, 3], [79, 2], [81, 4], [84, 4],
  [83, 8], [80, 4], [76, 4],
  [71, 2], [74, 2], [76, 2], [80, 2], [83, 8],
  // A'
  ...THEME_HEAD,
  [77, 3], [76, 3], [74, 2], [72, 2], [74, 2], [77, 4],
  [81, 6], [0, 2], [77, 2], [74, 2], [69, 4],
  [68, 3], [71, 3], [74, 2], [76, 4], [71, 4],
  [69, 8], [0, 4], [72, 2], [74, 2],
  // B'
  [77, 3], [76, 3], [77, 2], [81, 8],
  [79, 3], [77, 3], [79, 2], [83, 8],
  [84, 4], [83, 2], [81, 2], [79, 8],
  [76, 3], [77, 3], [76, 2], [72, 4], [69, 4],
  [74, 2], [77, 2], [81, 2], [77, 2], [74, 4], [72, 4],
  [69, 2], [72, 2], [77, 2], [72, 2], [76, 4], [79, 4],
  [80, 6], [81, 2], [83, 4], [80, 4],
  [76, 4], [74, 2], [71, 2], [68, 4], [64, 4]
])

const CHORDS = ROOTS.map((r, b) => voiced(r, QUAL[b], 57))

export const canyonChase: Song = {
  title: 'Canyon Chase',
  bpm: 152,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: 512,
  loopStart: 0,
  room: 0.3,
  echoBeats: 0.75,
  echoFeedback: 0.25,
  parts: [
    { inst: 'saw_lead', notes: melody, vol: 0.45, pan: 0.15, echo: 0.2 },
    {
      inst: 'bass', vol: 0.6,
      notes: everyBar(32, 16, b => {
        const r = ROOTS[b]
        const out: [number, number, number, number][] = []
        for (let s = 0; s < 16; s += 2) out.push([s, s % 4 === 2 ? r + 12 : r, 2, s % 8 ? 0.65 : 0.9])
        return out
      })
    },
    {
      inst: 'strings_stacc', vol: 0.3, pan: -0.25,
      notes: everyBar(32, 16, b => {
        const out: [number, number, number, number][] = []
        // B sections swap stabs for held chords under the broad answer line.
        const half = (b >> 3) % 2 === 1
        for (const s of half ? [0, 8] : [0, 3, 6, 10]) for (const n of CHORDS[b]) out.push([s, n, half ? 6 : 2, s ? 0.55 : 0.7])
        return out
      })
    },
    {
      inst: 'drums', vol: 0.55,
      notes: everyBar(32, 16, b => {
        const half = (b >> 3) % 2 === 1 && b % 8 < 6
        const out: [number, number, number, number][] = half
          ? [[0, DRUM.kick, 1, 0.95], [6, DRUM.kick, 1, 0.7], [10, DRUM.kick, 1, 0.75], [8, DRUM.snare, 1, 0.85]]
          : [[0, DRUM.kick, 1, 0.95], [3, DRUM.kick, 1, 0.7], [6, DRUM.kick, 1, 0.75], [8, DRUM.kick, 1, 0.85], [11, DRUM.kick, 1, 0.7], [4, DRUM.snare, 1, 0.8], [12, DRUM.snare, 1, 0.8]]
        for (let s = 0; s < 16; s += half ? 2 : 1) out.push([s, half ? DRUM.ride : DRUM.hatClosed, 1, s % 2 ? 0.2 : 0.4])
        if (b % 8 === 0) out.push([0, DRUM.crash, 4, 0.5])
        if (b % 8 === 7) out.push([12, DRUM.tomHigh, 1, 0.7], [13, DRUM.tomMid, 1, 0.7], [14, DRUM.tomLow, 1, 0.7], [15, DRUM.tomLow, 1, 0.8])
        return out
      })
    }
  ]
}
