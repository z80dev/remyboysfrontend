import { DRUM, type Note, type Song } from '../song'

/**
 * Mempool Meadow — D major, 140 BPM. Two-bar pickup → A8 → G-major lift B8 → homeward variation8.
 * The A phrase quotes the original title's D–F#–A / E–F#–D identity, answered by a skipping descent.
 * B7 tonicizes Em in B; E7 brightens the last climb, and a suspended A7 carries us back to D.
 * Offbeat guitar, contrary-moving bass, and answering strings leave air around the square lead.
 */
const lead: Note[] = []
const counter: Note[] = []
const chords: Note[] = []
const bass: Note[] = []
const sparkle: Note[] = []
const drums: Note[] = []
const tambourine: Note[] = []
type Figure = [offset: number, pitch: number, duration: number][]

function phrase(target: Note[], bar: number, notes: Figure, velocity: number) {
  for (let i = 0; i < notes.length; i++) {
    const [offset, pitch, duration] = notes[i]
    target.push([bar * 16 + offset, pitch, duration, velocity * (1 - ((i + bar * 3) % 5) * 0.027)])
  }
}

// Two upbeat pickup bars: the listener hears the destination before the walking groove arrives.
phrase(sparkle, 0, [[0, 74, 2], [4, 78, 2], [8, 81, 3], [12, 86, 3]], 0.6)
phrase(counter, 0, [[0, 62, 7], [8, 66, 7]], 0.54)
phrase(counter, 1, [[0, 64, 6], [8, 67, 4], [12, 69, 3]], 0.59)
phrase(lead, 1, [[8, 69, 1.6], [10, 73, 1.6], [12, 76, 1.6], [14, 73, 1.6]], 0.64)
phrase(bass, 0, [[0, 38, 6], [8, 45, 5]], 0.76)
phrase(bass, 1, [[0, 45, 5], [8, 40, 3], [12, 43, 1.7], [14, 45, 1.7]], 0.76)
for (const pitch of [62, 66, 69]) chords.push([0, pitch, 5, 0.53])
for (const pitch of [61, 67, 69]) chords.push([16, pitch, 5, 0.53])
for (const step of [24, 28, 30, 31]) drums.push([step, DRUM.snare, 0.5, step === 28 ? 0.68 : 0.4])

const melody: Figure[] = [
  [[0, 74, 1.7], [2, 78, 1.7], [4, 81, 3.5], [8, 76, 1.7], [10, 78, 1.7], [12, 74, 3.3]],
  [[0, 81, 5.5], [6, 78, 1.7], [8, 76, 2.8], [12, 74, 1.7], [14, 73, 1.7]],
  [[0, 71, 2.8], [4, 74, 1.7], [6, 78, 3.3], [10, 79, 1.7], [12, 78, 1.7], [14, 74, 1.7]],
  [[0, 76, 4.8], [6, 73, 1.7], [8, 69, 2.8], [12, 73, 1.7], [14, 76, 1.7]],
  [[0, 78, 1.7], [2, 81, 1.7], [4, 78, 3.5], [8, 76, 1.7], [10, 74, 3.3], [14, 73, 1.7]],
  [[0, 71, 3.4], [4, 76, 3.4], [8, 79, 2.8], [12, 78, 1.7], [14, 76, 1.7]],
  [[0, 73, 2.8], [4, 76, 1.7], [6, 81, 3.4], [10, 79, 1.7], [12, 76, 3.4]],
  [[0, 78, 2.8], [4, 74, 6.5], [12, 74, 1.7], [14, 78, 1.7]],
  // B opens on G: the same rhythm reaches up instead of repeating its A-section answer.
  [[0, 79, 3.4], [4, 83, 3.4], [8, 81, 1.7], [10, 79, 1.7], [12, 78, 3.3]],
  [[0, 81, 5.4], [6, 79, 1.7], [8, 76, 3.4], [12, 73, 3.2]],
  [[0, 78, 3.4], [4, 81, 1.7], [6, 80, 1.7], [8, 78, 3.3], [12, 76, 3.3]],
  [[0, 78, 2.8], [4, 75, 3.4], [8, 78, 1.7], [10, 81, 1.7], [12, 83, 3.3]],
  [[0, 79, 5.4], [6, 78, 1.7], [8, 76, 3.4], [12, 71, 3.3]],
  [[0, 73, 1.7], [2, 76, 1.7], [4, 81, 4.8], [10, 79, 1.7], [12, 76, 3.3]],
  [[0, 79, 3.4], [4, 76, 3.4], [8, 72, 2.8], [12, 74, 1.7], [14, 76, 1.7]],
  [[0, 73, 5.4], [6, 71, 1.7], [8, 69, 5.4], [14, 73, 1.7]],
  // Homeward variation: bass and melody trade rising/falling phrases before the final dominant.
  [[0, 74, 1.7], [2, 78, 1.7], [4, 81, 3.4], [8, 83, 3.4], [12, 81, 3.3]],
  [[0, 78, 5.4], [6, 76, 1.7], [8, 73, 3.4], [12, 69, 3.3]],
  [[0, 71, 1.7], [2, 74, 1.7], [4, 79, 3.4], [8, 78, 1.7], [10, 76, 1.7], [12, 74, 3.3]],
  [[0, 78, 2.8], [4, 81, 4.8], [10, 78, 1.7], [12, 74, 3.3]],
  [[0, 76, 3.4], [4, 79, 3.4], [8, 78, 1.7], [10, 76, 1.7], [12, 71, 3.3]],
  [[0, 76, 3.4], [4, 80, 3.4], [8, 83, 3.4], [12, 80, 1.7], [14, 78, 1.7]],
  [[0, 81, 5.4], [6, 79, 1.7], [8, 76, 3.4], [12, 73, 3.3]],
  [[0, 76, 2.8], [4, 73, 2.8], [8, 69, 3.4], [12, 71, 1.7], [14, 73, 1.7]],
]

// Close-position upper voices; the bass supplies roots/inversions without doubling low fifths.
const harmony = [
  [62, 66, 69], [62, 66, 71], [62, 67, 71], [61, 64, 69],
  [62, 66, 69], [62, 64, 67], [61, 67, 69], [62, 66, 69],
  [62, 67, 71], [61, 64, 69], [61, 66, 69], [63, 66, 69],
  [62, 64, 67], [61, 64, 69], [60, 64, 67], [61, 67, 69],
  [62, 66, 71], [61, 66, 69], [62, 67, 71], [62, 66, 69],
  [62, 64, 67], [62, 64, 68], [61, 64, 69], [61, 67, 69],
]
const roots = [38, 35, 43, 45, 42, 40, 45, 38, 43, 45, 42, 35, 40, 45, 36, 45, 35, 42, 43, 42, 40, 40, 45, 45]
const fifths = [45, 42, 50, 52, 45, 47, 52, 45, 50, 52, 49, 42, 47, 52, 43, 52, 42, 49, 50, 45, 47, 47, 52, 52]
const answers: Figure[] = [
  [[8, 66, 3.5], [12, 69, 3.5]], [[0, 66, 6], [8, 62, 6]],
  [[0, 67, 6], [8, 66, 3.5], [12, 62, 3.5]], [[4, 64, 5], [10, 61, 5]],
  [[0, 62, 6], [8, 66, 6]], [[0, 67, 6], [8, 64, 6]],
  [[0, 67, 7], [8, 64, 6]], [[0, 66, 6], [8, 69, 6]],
  [[0, 71, 6], [8, 74, 6]], [[0, 73, 6], [8, 69, 6]],
  [[0, 69, 6], [8, 73, 6]], [[0, 69, 6], [8, 66, 6]],
  [[0, 67, 6], [8, 71, 6]], [[0, 69, 6], [8, 67, 6]],
  [[0, 67, 6], [8, 64, 6]], [[0, 67, 6], [8, 64, 6]],
  [[0, 66, 6], [8, 62, 6]], [[0, 61, 6], [8, 66, 6]],
  [[0, 67, 6], [8, 71, 6]], [[0, 69, 6], [8, 66, 6]],
  [[0, 64, 6], [8, 67, 6]], [[0, 68, 6], [8, 71, 6]],
  [[0, 69, 6], [8, 67, 6]], [[0, 64, 7], [8, 61, 6]],
]

for (let sectionBar = 0; sectionBar < 24; sectionBar++) {
  const bar = sectionBar + 2
  const lift = sectionBar >= 8 && sectionBar < 16
  phrase(lead, bar, melody[sectionBar], lift ? 0.85 : 0.8)
  phrase(counter, bar, answers[sectionBar], lift ? 0.63 : 0.53)
  for (const offset of [2, 6, 10, 14]) {
    for (const pitch of harmony[sectionBar]) {
      chords.push([bar * 16 + offset, pitch, 1.55, offset === 6 ? 0.57 : 0.49])
    }
  }
  const root = roots[sectionBar]
  const next = roots[(sectionBar + 1) % 24]
  const approach = next > root ? next - 1 : next + 1
  phrase(bass, bar, [[0, root, 2.8], [4, fifths[sectionBar], 1.6], [6, root + 12, 1.6],
    [8, root, 2.8], [12, fifths[sectionBar], 1.6], [14, approach, 1.6]], 0.82)
  if (sectionBar % 4 === 3) {
    phrase(sparkle, bar, [[10, harmony[sectionBar][0] + 12, 1.2],
      [12, harmony[sectionBar][1] + 12, 1.2], [14, harmony[sectionBar][2] + 12, 1.2]], 0.46)
  }
  for (const offset of [0, 6, 8]) drums.push([bar * 16 + offset, DRUM.kick, 0.5, offset === 0 ? 0.9 : 0.74])
  for (const offset of [4, 12]) drums.push([bar * 16 + offset, DRUM.snare, 0.5, offset === 4 ? 0.75 : 0.82])
  for (let offset = 0; offset < 16; offset += 2) {
    drums.push([bar * 16 + offset, DRUM.hatClosed, 0.4, offset % 4 ? 0.44 : 0.32])
    tambourine.push([bar * 16 + offset, DRUM.tambourine, 0.6, offset % 4 ? 0.48 : 0.29])
  }
  if (sectionBar === 0 || sectionBar === 8 || sectionBar === 16) {
    drums.push([bar * 16, DRUM.crash, 2, 0.45])
  }
  if (sectionBar % 8 === 7) {
    phrase(drums, bar, [[13, DRUM.snare, 0.4], [14, DRUM.tomHigh, 0.6], [15, DRUM.tomMid, 0.6]], 0.58)
  }
}

const route: Song = {
  title: 'Mempool Meadow — A Pocketful of Sky',
  bpm: 140,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: 26 * 16,
  loopStart: 2 * 16,
  swing: 0.045,
  room: 0.36,
  echoBeats: 0.75,
  echoFeedback: 0.13,
  parts: [
    { inst: 'square', notes: lead, vol: 0.58, pan: -0.07, reverb: 0.12, echo: 0.055 },
    { inst: 'strings', notes: counter, vol: 0.48, pan: 0.2, reverb: 0.26 },
    { inst: 'guitar', notes: chords, vol: 0.46, pan: -0.27, reverb: 0.13 },
    { inst: 'bass_finger', notes: bass, vol: 0.55, pan: 0, reverb: 0.035 },
    { inst: 'bell', notes: sparkle, vol: 0.32, pan: 0.28, reverb: 0.28 },
    { inst: 'drums', notes: drums, vol: 0.68, pan: 0, reverb: 0.08 },
    { inst: 'drums', notes: tambourine, vol: 0.5, pan: 0.25, reverb: 0.08 },
  ],
}

export default route
