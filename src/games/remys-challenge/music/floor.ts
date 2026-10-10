import type { Song } from '../../kit'
import { DRUM } from '../../../quest/music/song'
import { everyBar, line } from './notes'

// D dorian, thoughtful: Dm7 G7 Dm7 G7 | Bbmaj7 C Am7 A7
const ROOTS = [38, 43, 38, 43, 46, 48, 45, 45]
const TONES = [[0, 3, 7, 10], [0, 4, 7, 10], [0, 3, 7, 10], [0, 4, 7, 10], [0, 4, 7, 11], [0, 4, 7, 12], [0, 3, 7, 10], [0, 4, 7, 10]]
const ARP = [0, 2, 1, 3, 4, 2, 3, 1]

const melody = line([
  [0, 4], [81, 2], [77, 2], [76, 4], [74, 4],
  [0, 4], [79, 2], [76, 2], [74, 4], [71, 4],
  [0, 4], [81, 2], [84, 2], [81, 4], [77, 4],
  [79, 8], [0, 8],
  [77, 4], [81, 4], [84, 4], [82, 4],
  [81, 4], [79, 4], [76, 8],
  [76, 4], [73, 4], [76, 4], [79, 4],
  [77, 6], [76, 2], [73, 8]
], 0, 0.7)

export const floorPuzzle: Song = {
  title: 'Floor Puzzle',
  bpm: 92,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: 128,
  loopStart: 0,
  swing: 0.12,
  room: 0.45,
  echoBeats: 0.75,
  echoFeedback: 0.3,
  parts: [
    { inst: 'music_box', notes: melody, vol: 0.5, pan: 0.2, echo: 0.3, reverb: 0.4 },
    {
      inst: 'marimba', vol: 0.55, pan: -0.15,
      notes: everyBar(8, 16, b => ARP.map((i, k) => {
        const t = TONES[b]
        return [k * 2, ROOTS[b] + 24 + (i === 4 ? 12 : t[i]), 2, k % 2 ? 0.5 : 0.7] as [number, number, number, number]
      }))
    },
    {
      inst: 'bass_finger', vol: 0.6,
      notes: everyBar(8, 16, b => [[0, ROOTS[b], 6, 0.8], [8, ROOTS[b] + 7, 4, 0.6], [12, ROOTS[b], 4, 0.65]])
    },
    {
      inst: 'drums', vol: 0.35,
      notes: everyBar(8, 16, () => {
        const out: [number, number, number, number][] = [[6, DRUM.woodblock, 1, 0.4], [14, DRUM.woodblock, 1, 0.35], [0, DRUM.kick, 1, 0.5]]
        for (let s = 0; s < 16; s += 2) out.push([s, DRUM.shaker, 1, 0.3])
        return out
      })
    }
  ]
}
