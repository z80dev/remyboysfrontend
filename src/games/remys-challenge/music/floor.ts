import type { Song } from '../../kit'
import { DRUM } from '../../../quest/music/song'
import { everyBar, line } from './notes'

// D dorian, thoughtful, 32 bars:
// A  Dm7 G7 Dm7 G7 | Bbmaj7 C Am7 A7          (original theme)
// B  Bbmaj7 Am7 Gm7 Fmaj7 | Em7b5 A7 Dm7 A7   (descending-bass answer, ii-V back to D)
// A' Dm7 G7 Dm7 G7 | Bbmaj7 A7 Dm7 Dm7        (theme returns, settles on the tonic)
// B' Bbmaj7 Am7 Gm7 Fmaj7 | Em7b5 A7 Dm7 A7   (answer echoed off the beat; A7 loops home to Dm7)
const M7 = [0, 3, 7, 10]
const D7 = [0, 4, 7, 10]
const MA7 = [0, 4, 7, 11]
const HD7 = [0, 3, 6, 10]
const MAJ8 = [0, 4, 7, 12]
const ROOTS = [
  38, 43, 38, 43, 46, 48, 45, 45,
  46, 45, 43, 41, 40, 45, 38, 45,
  38, 43, 38, 43, 46, 45, 38, 38,
  46, 45, 43, 41, 40, 45, 38, 45
]
const TONES = [
  M7, D7, M7, D7, MA7, MAJ8, M7, D7,
  MA7, M7, M7, MA7, HD7, D7, M7, D7,
  M7, D7, M7, D7, MA7, D7, M7, M7,
  MA7, M7, M7, MA7, HD7, D7, M7, D7
]
const ARP = [0, 2, 1, 3, 4, 2, 3, 1]
const ARP_B = [4, 3, 2, 1, 0, 1, 2, 3]

const THEME_HEAD: [number, number][] = [
  [0, 4], [81, 2], [77, 2], [76, 4], [74, 4],
  [0, 4], [79, 2], [76, 2], [74, 4], [71, 4],
  [0, 4], [81, 2], [84, 2], [81, 4], [77, 4]
]

const melody = line([
  // A
  ...THEME_HEAD,
  [79, 8], [0, 8],
  [77, 4], [81, 4], [84, 4], [82, 4],
  [81, 4], [79, 4], [76, 8],
  [76, 4], [73, 4], [76, 4], [79, 4],
  [77, 6], [76, 2], [73, 8],
  // B
  [74, 2], [77, 2], [81, 4], [0, 4], [77, 2], [74, 2],
  [72, 2], [76, 2], [79, 4], [0, 4], [76, 2], [72, 2],
  [70, 2], [74, 2], [77, 4], [79, 2], [77, 2], [74, 4],
  [76, 8], [72, 4], [69, 4],
  [70, 4], [67, 2], [70, 2], [74, 4], [76, 4],
  [73, 4], [76, 2], [79, 2], [81, 4], [79, 4],
  [77, 4], [76, 2], [74, 2], [72, 4], [69, 4],
  [73, 8], [76, 4], [0, 4],
  // A'
  ...THEME_HEAD,
  [79, 8], [77, 2], [76, 2], [74, 4],
  [77, 4], [81, 4], [86, 4], [84, 4],
  [85, 4], [81, 4], [79, 4], [76, 4],
  [77, 8], [74, 4], [69, 4],
  [74, 8], [0, 8],
  // B'
  [0, 4], [81, 4], [77, 4], [74, 4],
  [0, 4], [79, 4], [76, 4], [72, 4],
  [0, 2], [74, 2], [77, 2], [82, 2], [81, 4], [77, 4],
  [76, 12], [0, 4],
  [74, 4], [76, 2], [79, 2], [82, 4], [79, 4],
  [81, 4], [79, 2], [76, 2], [73, 8],
  [74, 4], [77, 4], [81, 4], [84, 4],
  [85, 6], [81, 2], [76, 4], [73, 4]
], 0, 0.7)

export const floorPuzzle: Song = {
  title: 'Floor Puzzle',
  bpm: 92,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: 512,
  loopStart: 0,
  swing: 0.12,
  room: 0.45,
  echoBeats: 0.75,
  echoFeedback: 0.3,
  parts: [
    { inst: 'music_box', notes: melody, vol: 0.5, pan: 0.2, echo: 0.3, reverb: 0.4 },
    {
      inst: 'marimba', vol: 0.55, pan: -0.15,
      notes: everyBar(32, 16, b => {
        const arp = (b >> 3) % 2 ? ARP_B : ARP
        const t = TONES[b]
        return arp.map((i, k) => [k * 2, ROOTS[b] + 24 + (i === 4 ? 12 : t[i]), 2, k % 2 ? 0.5 : 0.7] as [number, number, number, number])
      })
    },
    {
      inst: 'bass_finger', vol: 0.6,
      notes: everyBar(32, 16, b => {
        const r = ROOTS[b]
        if ((b >> 3) % 2) return [[0, r, 4, 0.8], [4, r + TONES[b][1], 4, 0.6], [8, r + 7, 4, 0.65], [12, ROOTS[(b + 1) % 32] + 1, 4, 0.55]]
        return [[0, r, 6, 0.8], [8, r + 7, 4, 0.6], [12, r, 4, 0.65]]
      })
    },
    {
      inst: 'drums', vol: 0.35,
      notes: everyBar(32, 16, b => {
        const out: [number, number, number, number][] = [[6, DRUM.woodblock, 1, 0.4], [14, DRUM.woodblock, 1, 0.35], [0, DRUM.kick, 1, 0.5]]
        if ((b >> 3) % 2) out.push([10, DRUM.rim, 1, 0.3])
        for (let s = 0; s < 16; s += 2) out.push([s, DRUM.shaker, 1, 0.3])
        return out
      })
    }
  ]
}
