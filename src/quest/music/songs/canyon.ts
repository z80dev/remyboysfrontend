import { DRUM, type Note, type Part, type Song } from '../song'

/**
 * Saffron at Sundown — D Phrygian, with C# leading tones at the A7 cadences. 104 BPM.
 * Two-bar guitar pickup, then 24 bars: whispered A (8), widening B (8), returning A' (8).
 * The original hook falls A–F–Eb–D, then reaches G before the semitone C#–D answer.
 * Close upper voicings move above a single low root; no stacked low fifths. The last A7
 * leans into the returning D minor while harp/echo tails continue across the loop.
 */
const guitar: Note[] = []
const harp: Note[] = []
const whistle: Note[] = []
const flute: Note[] = []
const strings: Note[] = []
const bass: Note[] = []
const percussion: Note[] = []

const chords = {
  dm: { root: 38, notes: [57, 62, 65, 69] },
  eb: { root: 39, notes: [58, 62, 63, 67] },
  dm9: { root: 38, notes: [57, 62, 65, 76] },
  a7: { root: 45, notes: [55, 61, 64, 69] },
  gm: { root: 43, notes: [58, 62, 67, 70] },
  bb: { root: 46, notes: [57, 62, 65, 70] },
  c: { root: 48, notes: [55, 60, 64, 67] },
  dmf: { root: 41, notes: [57, 62, 65, 69] },
  asus: { root: 45, notes: [55, 62, 64, 69] },
} as const
const progression: (keyof typeof chords)[] = [
  'dm', 'eb', 'dm9', 'a7', 'gm', 'bb', 'eb', 'a7',
  'dm', 'c', 'bb', 'a7', 'gm', 'dmf', 'eb', 'a7',
  'dm', 'eb', 'bb', 'a7', 'gm', 'eb', 'asus', 'a7',
]

// Each phrase preserves deliberate rests; offset and duration are sixteenth-note steps.
const melody: [number, number, number][][] = [
  [[2, 81, 3], [6, 77, 2], [9, 75, 2], [12, 74, 3]],
  [[1, 77, 2], [4, 79, 4], [10, 75, 4]],
  [[0, 74, 5], [7, 77, 2], [10, 76, 2], [13, 74, 2]],
  [[1, 73, 3], [6, 76, 2], [10, 73, 4]],
  [[2, 74, 2], [5, 77, 3], [10, 79, 4]],
  [[0, 81, 3], [4, 77, 2], [8, 74, 5]],
  [[2, 75, 4], [8, 79, 2], [11, 77, 2], [14, 75, 1]],
  [[0, 76, 3], [4, 73, 5], [12, 69, 2]],
  [[0, 81, 4], [5, 84, 2], [8, 86, 5], [14, 81, 1]],
  [[0, 79, 3], [4, 84, 3], [9, 83, 2], [12, 79, 3]],
  [[0, 82, 5], [6, 81, 2], [9, 77, 3], [13, 74, 2]],
  [[1, 76, 2], [4, 81, 3], [8, 79, 2], [11, 73, 4]],
  [[0, 79, 3], [4, 82, 3], [8, 81, 2], [12, 79, 3]],
  [[0, 77, 5], [6, 74, 2], [10, 81, 4]],
  [[0, 79, 3], [4, 75, 3], [8, 77, 2], [11, 75, 4]],
  [[0, 76, 4], [6, 73, 3], [11, 69, 3]],
  [[2, 81, 3], [6, 77, 2], [9, 75, 2], [12, 74, 3]],
  [[0, 77, 2], [4, 79, 4], [10, 82, 3], [14, 79, 1]],
  [[0, 81, 4], [6, 77, 3], [11, 74, 4]],
  [[2, 73, 3], [6, 76, 2], [10, 81, 4]],
  [[0, 79, 5], [7, 77, 2], [10, 74, 4]],
  [[0, 75, 4], [6, 79, 2], [10, 77, 2], [13, 75, 2]],
  [[0, 74, 6], [8, 76, 3], [12, 74, 3]],
  [[0, 73, 5], [8, 69, 3], [13, 73, 2]],
]

function arpeggio(start: number, notes: readonly number[], intensity: number, alternate: boolean) {
  const order = alternate ? [0, 2, 1, 3, 2, 1, 3, 2] : [0, 1, 2, 3, 1, 2, 3, 1]
  for (let i = 0; i < order.length; i++) {
    guitar.push([start + i * 2 + (i % 2 ? 0.045 : 0), notes[order[i]], 3.4, intensity * (i % 3 ? 0.82 : 1)])
  }
}

// The introduction starts alone, allowing the room to appear around the player.
arpeggio(0, chords.dm.notes, 0.62, false)
arpeggio(16, chords.a7.notes, 0.57, true)
strings.push([4, 50, 26, 0.42])
harp.push([24, 69, 5, 0.48], [28, 73, 5, 0.44], [30, 76, 5, 0.4])

for (let bar = 0; bar < progression.length; bar++) {
  const start = (bar + 2) * 16
  const chord = chords[progression[bar]]
  const build = bar >= 8 && bar < 16
  arpeggio(start, chord.notes, build ? 0.75 : 0.63, bar % 2 === 1)
  bass.push([start, chord.root, 11.5, build ? 0.68 : 0.56])
  if (build || bar % 4 === 3) bass.push([start + 12, chord.root + 12, 3.5, 0.43])
  strings.push([start + 0.12, chord.root + 12, 15.8, build ? 0.61 : 0.46])
  // Upper strings only enter with the widened horizon of B.
  if (build || bar >= 20) {
    for (const pitch of chord.notes.slice(1, 3)) strings.push([start + 0.18, pitch + 12, 15.6, 0.39])
  }
  for (let i = 0; i < melody[bar].length; i++) {
    const [step, pitch, duration] = melody[bar][i]
    whistle.push([start + step, pitch, duration - 0.2, (build ? 0.81 : 0.72) - (i % 3) * 0.045])
  }
  if (build) {
    const answers = [[65, 69], [64, 67], [65, 69], [64, 61], [67, 70], [65, 69], [67, 63], [64, 61]]
    flute.push([start + 3, answers[bar - 8][0], 4.5, 0.57], [start + 10, answers[bar - 8][1], 4, 0.52])
  }
  if (bar % 2 === 1 || build) {
    harp.push([start + 8, chord.notes[2] + 12, 5.5, 0.48], [start + 12, chord.notes[3] + 12, 5, 0.42])
  }
  for (const step of build ? [2, 6, 10, 14] : [6, 14]) {
    percussion.push([start + step + 0.06, DRUM.shaker, 0.8, step === 14 ? 0.44 : 0.32])
  }
  percussion.push([start + 7, DRUM.conga, 1.6, 0.44], [start + 12, DRUM.conga, 1.8, 0.57])
  if (bar % 4 === 3) {
    percussion.push([start + 14, DRUM.bongo, 1, 0.48], [start + 15, DRUM.conga, 1, 0.38])
  }
}

const parts: Part[] = [
  { inst: 'whistle', notes: whistle, vol: 0.68, pan: -0.1, reverb: 0.33, echo: 0.29 },
  { inst: 'flute', notes: flute, vol: 0.34, pan: 0.28, reverb: 0.38, echo: 0.13 },
  { inst: 'guitar', notes: guitar, vol: 0.55, pan: -0.3, reverb: 0.24, echo: 0.06 },
  { inst: 'harp', notes: harp, vol: 0.36, pan: 0.4, reverb: 0.42, echo: 0.18 },
  { inst: 'strings', notes: strings, vol: 0.37, pan: 0.08, reverb: 0.42 },
  { inst: 'bass_finger', notes: bass, vol: 0.49, pan: 0, reverb: 0.1 },
  { inst: 'drums', notes: percussion, vol: 0.34, pan: 0.18, reverb: 0.2 },
]

const song: Song = {
  title: 'Saffron at Sundown',
  bpm: 104,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: 26 * 16,
  loopStart: 2 * 16,
  room: 0.67,
  echoBeats: 0.75,
  echoFeedback: 0.3,
  parts,
}

export default song
