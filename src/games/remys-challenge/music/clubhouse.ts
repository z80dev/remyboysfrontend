import type { Song } from '../../kit'
import { DRUM } from '../../../quest/music/song'
import { everyBar, line, MAJ, MIN, voiced } from './notes'

// C major, bouncy, 32 bars:
// A  C Am F G | C Am Dm G      (original theme)
// B  F G Em Am | Dm G C G      (lower, syncopated answer on the subdominant)
// A' C Am F G | Dm G C C       (theme returns, closes on a real cadence)
// B' F G Em Am | Dm Em F G     (answer climbs, stepwise bass rises to G → loops home to C)
const ROOTS = [
  36, 33, 41, 43, 36, 33, 38, 43,
  41, 43, 40, 33, 38, 43, 36, 43,
  36, 33, 41, 43, 38, 43, 36, 36,
  41, 43, 40, 33, 38, 40, 41, 43
]
const QUAL = [
  MAJ, MIN, MAJ, MAJ, MAJ, MIN, MIN, MAJ,
  MAJ, MAJ, MIN, MIN, MIN, MAJ, MAJ, MAJ,
  MAJ, MIN, MAJ, MAJ, MIN, MAJ, MAJ, MAJ,
  MAJ, MAJ, MIN, MIN, MIN, MIN, MAJ, MAJ
]

const THEME_HEAD: [number, number][] = [
  [72, 2], [76, 2], [79, 2], [76, 2], [77, 2], [76, 2], [72, 4],
  [69, 2], [72, 2], [76, 4], [74, 2], [72, 2], [69, 4],
  [65, 2], [69, 2], [72, 2], [77, 2], [76, 2], [74, 2], [72, 2], [69, 2],
  [71, 4], [74, 2], [79, 6], [0, 4]
]

const melody = line([
  // A
  ...THEME_HEAD,
  [79, 2], [77, 2], [76, 2], [77, 2], [79, 4], [72, 4],
  [76, 2], [74, 2], [72, 2], [74, 2], [76, 4], [69, 4],
  [74, 2], [77, 2], [81, 2], [77, 2], [76, 2], [74, 2], [72, 2], [71, 2],
  [74, 2], [71, 2], [67, 2], [71, 2], [74, 4], [0, 4],
  // B
  [69, 6], [72, 2], [69, 4], [65, 4],
  [67, 6], [71, 2], [74, 4], [71, 4],
  [71, 4], [67, 2], [71, 2], [76, 8],
  [72, 2], [71, 2], [69, 4], [64, 8],
  [65, 2], [69, 2], [74, 4], [72, 2], [74, 2], [77, 4],
  [79, 4], [77, 2], [76, 2], [74, 8],
  [72, 4], [76, 4], [79, 4], [76, 4],
  [74, 2], [72, 2], [71, 2], [69, 2], [67, 8],
  // A'
  ...THEME_HEAD,
  [77, 2], [76, 2], [74, 2], [72, 2], [74, 4], [77, 4],
  [79, 2], [81, 2], [79, 2], [77, 2], [76, 2], [74, 2], [71, 4],
  [72, 4], [76, 2], [79, 2], [84, 8],
  [84, 2], [79, 2], [76, 2], [72, 2], [67, 4], [0, 4],
  // B'
  [77, 6], [76, 2], [72, 4], [69, 4],
  [74, 6], [76, 2], [79, 4], [74, 4],
  [76, 4], [79, 2], [83, 2], [79, 8],
  [81, 2], [79, 2], [76, 4], [72, 8],
  [74, 4], [77, 4], [81, 4], [77, 4],
  [79, 4], [76, 4], [71, 4], [67, 4],
  [69, 2], [72, 2], [77, 2], [81, 2], [79, 4], [77, 4],
  [74, 4], [71, 2], [74, 2], [79, 4], [0, 4]
])

const CHORDS = ROOTS.map((r, b) => voiced(r, QUAL[b], 60))

export const clubhouseTheme: Song = {
  title: 'Clubhouse Theme',
  bpm: 132,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: 512,
  loopStart: 0,
  swing: 0.08,
  room: 0.25,
  echoBeats: 0.75,
  echoFeedback: 0.2,
  parts: [
    { inst: 'square', notes: melody, vol: 0.55, pan: 0.1, echo: 0.15 },
    {
      inst: 'bass_finger', vol: 0.7,
      notes: everyBar(32, 16, b => {
        const r = ROOTS[b]
        // B sections relax into a two-feel so the answer melody can breathe.
        if ((b >> 3) % 2) return [[0, r, 4, 0.9], [6, r + 7, 2, 0.65], [8, r + 12, 4, 0.75], [12, r + 7, 2, 0.65], [14, ROOTS[(b + 1) % 32] - 1, 2, 0.55]]
        return [[0, r, 2, 0.9], [3, r, 1, 0.6], [4, r + 7, 2, 0.75], [8, r + 12, 2, 0.8], [10, r + 7, 2, 0.65], [12, r, 2, 0.8], [14, r + 7, 2, 0.65]]
      })
    },
    {
      inst: 'square50', vol: 0.22, pan: -0.3,
      notes: everyBar(32, 16, b => {
        const out: [number, number, number, number][] = []
        const steps = b === 23 ? [0] : (b >> 3) % 2 ? [2, 7, 10] : [2, 6, 10, 14]
        for (const s of steps) for (const n of CHORDS[b]) out.push([s, n, b === 23 ? 8 : 1, 0.5])
        return out
      })
    },
    {
      inst: 'drums', vol: 0.5,
      notes: everyBar(32, 16, b => {
        if (b === 23) return [[0, DRUM.kick, 1, 0.9], [0, DRUM.crash, 4, 0.4], [12, DRUM.snare, 1, 0.5], [14, DRUM.snare, 1, 0.6], [15, DRUM.snare, 1, 0.7]]
        const out: [number, number, number, number][] = [[0, DRUM.kick, 1, 0.9], [8, DRUM.kick, 1, 0.8], [4, DRUM.snare, 1, 0.7], [12, DRUM.snare, 1, 0.7]]
        const b2 = (b >> 3) % 2
        for (let s = 0; s < 16; s += 2) out.push([s, b2 && s % 4 === 2 ? DRUM.tambourine : DRUM.hatClosed, 1, s % 4 ? 0.35 : 0.5])
        if (b % 8 === 0 && b) out.push([0, DRUM.crash, 4, 0.45])
        if (b % 8 === 7) out.push([14, DRUM.tomHigh, 1, 0.6], [15, DRUM.tomMid, 1, 0.6])
        return out
      })
    }
  ]
}
