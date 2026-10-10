import { DRUM, type Note, type Song } from '../quest/music/song'

/**
 * "Night of the Cabald" — D minor, 150 BPM. Opens on the public-domain Toccata in D minor (BWV 565) mordent and run on
 * a cathedral organ, then loops it as a haunted-house metal chug: saw bass eighths, choir pads, a funeral bell on the
 * downbeat of each phrase. Bars: Dm Dm B♭ A | Dm Dm Gm A.
 */
const organ: Note[] = []
const bass: Note[] = []
const choir: Note[] = []
const bell: Note[] = []
const drums: Note[] = []

// Intro (bars 0–1): the mordent, the run down to C♯, the low D with a full minor chord underneath.
for (const [s, m, l] of [
  [0, 81, 1],
  [1, 79, 1],
  [2, 81, 7],
  [10, 79, 1],
  [11, 77, 1],
  [12, 76, 1],
  [13, 74, 1],
  [14, 73, 2],
  [16, 74, 12],
])
  organ.push([s, m, l, 0.85])
for (const m of [38, 50, 53, 57]) organ.push([16, m, 14, 0.7])
bell.push([16, 62, 16, 0.6])
drums.push([16, DRUM.crash, 2, 0.7], [16, DRUM.timpaniRoll, 12, 0.5])

const MINOR = [7, 5, 3, 2, 0, -1, 0]
const MAJOR = [7, 5, 4, 2, 0, -1, 0]
const bars: { root: number; bassRoot: number; run: number[]; chord: number[] }[] = [
  { root: 74, bassRoot: 38, run: MINOR, chord: [62, 65, 69] },
  { root: 74, bassRoot: 38, run: MINOR, chord: [62, 65, 69] },
  { root: 70, bassRoot: 34, run: MAJOR, chord: [58, 62, 65] },
  { root: 69, bassRoot: 33, run: MAJOR, chord: [57, 61, 64] },
  { root: 74, bassRoot: 38, run: MINOR, chord: [62, 65, 69] },
  { root: 74, bassRoot: 38, run: MINOR, chord: [62, 65, 69] },
  { root: 67, bassRoot: 31, run: MINOR, chord: [55, 58, 62] },
  { root: 69, bassRoot: 33, run: MAJOR, chord: [57, 61, 64] },
]

bars.forEach((b, i) => {
  const at = (2 + i) * 16
  // Toccata run, then its echo an octave down.
  b.run.forEach((o, k) => organ.push([at + k, b.root + o, k === 6 ? 2 : 1, k === 0 ? 0.8 : 0.66]))
  b.run.forEach((o, k) => organ.push([at + 8 + k, b.root - 12 + o, k === 6 ? 2 : 1, 0.55]))
  // Palm-muted chug with a fifth on the accents.
  for (let s = 0; s < 16; s += 2) {
    const accent = s === 0 || s === 6 || s === 12
    bass.push([at + s, b.bassRoot, accent ? 1.6 : 0.9, accent ? 0.9 : 0.62])
    if (accent) bass.push([at + s, b.bassRoot + 7, 1.6, 0.5])
  }
  choir.push(...b.chord.map((m): Note => [at, m, 16, 0.5]))
  if (i % 4 === 0) bell.push([at, 50, 16, 0.55])
  for (const s of [0, 6, 10]) drums.push([at + s, DRUM.kick, 1, 0.9])
  for (const s of [4, 12]) drums.push([at + s, DRUM.snare, 1, 0.8])
  for (let s = 0; s < 16; s += 2) drums.push([at + s, DRUM.hatClosed, 0.5, s % 4 ? 0.3 : 0.45])
  if (i === 3 || i === 7) for (const s of [12, 13, 14, 15]) drums.push([at + s, DRUM.tomLow, 1, 0.6 + (s - 12) * 0.08])
  if (i === 0 || i === 4) drums.push([at, DRUM.crash, 2, 0.6])
})

export default {
  title: 'Night of the Cabald',
  bpm: 150,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: 10 * 16,
  loopStart: 2 * 16,
  room: 0.7,
  echoBeats: 0.75,
  echoFeedback: 0.2,
  parts: [
    { inst: 'organ', notes: organ, vol: 0.5, pan: 0, reverb: 0.45, echo: 0.08 },
    { inst: 'bass_saw', notes: bass, vol: 0.42, pan: 0, reverb: 0.04 },
    { inst: 'choir', notes: choir, vol: 0.26, pan: -0.2, reverb: 0.5 },
    { inst: 'bell', notes: bell, vol: 0.38, pan: 0.25, reverb: 0.6 },
    { inst: 'drums', notes: drums, vol: 0.55, pan: 0, reverb: 0.12 },
  ],
} satisfies Song
