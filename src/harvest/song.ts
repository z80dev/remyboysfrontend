import { DRUM, type Note, type Song } from '../quest/music/song'

/**
 * "Remy's Harvest" — G major, 116 BPM, an original sunny folk tune: wooden flute melody over strummed nylon guitar,
 * marimba eighths, round bass and a shaker/tambourine groove. One bar of guitar intro, then an 8-bar loop:
 * G D Em C | G D C D.
 */
const flute: Note[] = []
const ocarina: Note[] = []
const guitar: Note[] = []
const marimba: Note[] = []
const bass: Note[] = []
const drums: Note[] = []

const CHORDS: Record<string, { tones: number[]; root: number }> = {
  G: { tones: [55, 59, 62, 67], root: 43 },
  D: { tones: [57, 62, 66, 69], root: 38 },
  Em: { tones: [55, 59, 64, 67], root: 40 },
  C: { tones: [55, 60, 64, 67], root: 36 },
}
const BARS = ['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D']

// [step, midi, len] per bar.
const MELODY: [number, number, number][][] = [
  [[0, 74, 2], [2, 79, 2], [4, 81, 2], [6, 83, 4], [10, 81, 2], [12, 79, 4]],
  [[0, 81, 2], [2, 83, 2], [4, 86, 4], [8, 83, 2], [10, 81, 2], [12, 78, 4]],
  [[0, 79, 2], [2, 83, 2], [4, 88, 4], [8, 86, 2], [10, 83, 2], [12, 81, 4]],
  [[0, 79, 4], [4, 76, 2], [6, 79, 2], [8, 81, 8]],
  [[0, 74, 2], [2, 79, 2], [4, 81, 2], [6, 83, 4], [10, 86, 2], [12, 88, 4]],
  [[0, 86, 2], [2, 83, 2], [4, 81, 4], [8, 83, 2], [10, 81, 2], [12, 78, 4]],
  [[0, 76, 2], [2, 79, 2], [4, 84, 4], [8, 83, 2], [10, 81, 2], [12, 79, 2], [14, 81, 2]],
  [[0, 79, 8], [8, 74, 2], [10, 78, 2], [12, 81, 4]],
]

const strum = (at: number, tones: number[], vel: number) =>
  tones.forEach((m, k) => guitar.push([at + k * 0.12, m, 3, vel - k * 0.04]))

// Intro bar: two strums and the shaker.
strum(0, CHORDS.G.tones, 0.7)
strum(8, CHORDS.G.tones, 0.6)
for (let s = 0; s < 16; s += 2) drums.push([s, DRUM.shaker, 1, s % 4 ? 0.25 : 0.4])
drums.push([12, DRUM.conga, 1, 0.5], [14, DRUM.conga, 1, 0.6])

BARS.forEach((name, i) => {
  const at = 16 + i * 16
  const c = CHORDS[name]
  for (const [s, m, l] of MELODY[i]) {
    flute.push([at + s, m, l, s === 0 ? 0.85 : 0.72])
    // Ocarina answers a third/sixth below on the long notes.
    if (l >= 4) ocarina.push([at + s, m - (name === 'Em' || name === 'C' ? 4 : 3), l, 0.45])
  }
  for (const s of [0, 6, 8, 12, 14]) strum(at + s, c.tones, s === 0 || s === 8 ? 0.62 : 0.45)
  for (let s = 0; s < 16; s += 2) marimba.push([at + s, c.tones[(s / 2) % 4] + 12, 1.5, s % 4 ? 0.32 : 0.42])
  bass.push([at, c.root, 5, 0.85], [at + 6, c.root + 7, 2, 0.6], [at + 8, c.root + 12, 4, 0.7], [at + 12, c.root + 7, 3, 0.6])
  for (const s of [0, 8, 10]) drums.push([at + s, DRUM.kick, 1, s === 10 ? 0.55 : 0.85])
  for (const s of [4, 12]) drums.push([at + s, DRUM.clap, 1, 0.42], [at + s, DRUM.tambourine, 1, 0.45])
  for (let s = 0; s < 16; s += 2) drums.push([at + s, DRUM.shaker, 1, s % 4 ? 0.24 : 0.36])
  if (i === 3 || i === 7) for (const s of [12, 13, 14, 15]) drums.push([at + s, DRUM.conga, 1, 0.45 + (s - 12) * 0.08])
})

export default {
  title: "Remy's Harvest",
  bpm: 116,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: 16 + BARS.length * 16,
  loopStart: 16,
  swing: 0.12,
  room: 0.45,
  echoBeats: 0.75,
  echoFeedback: 0.18,
  parts: [
    { inst: 'flute', notes: flute, vol: 0.42, pan: 0.1, reverb: 0.35, echo: 0.12 },
    { inst: 'ocarina', notes: ocarina, vol: 0.2, pan: -0.25, reverb: 0.4 },
    { inst: 'guitar', notes: guitar, vol: 0.3, pan: -0.15, reverb: 0.2 },
    { inst: 'marimba', notes: marimba, vol: 0.2, pan: 0.3, reverb: 0.25 },
    { inst: 'bass_finger', notes: bass, vol: 0.45, pan: 0, reverb: 0.05 },
    { inst: 'drums', notes: drums, vol: 0.5, pan: 0, reverb: 0.12 },
  ],
} satisfies Song
