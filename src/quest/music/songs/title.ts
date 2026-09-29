/**
 * “A Thousand Faces, One Adventure” — D major, 132 BPM, original Remy Quest identity theme.
 * Head motif MIDI: [74, 78, 81, 76, 78, 74, 81]; sixteenth onsets [0, 2, 4, 8, 10, 12, 16],
 * lengths [2, 2, 4, 2, 2, 4, 8]. D–F#–A / E–F#–D / held A: a call, an answer, an open horizon.
 * Form: two-bar once-only fanfare → A (8) → B (8, woodwind answer) → A′ (8, soaring countermelody).
 * The loop is 43.64 seconds. A/C# and G/B keep the bass descending; E7 is V/V, Gm the borrowed iv.
 * Inner strings move by common tones/steps, never root-position blocks marching with the bass.
 * Mix reference: 44.1 kHz offline intro + two loop passes, RMS 0.0863 / peak 0.4196 through the live master.
 */
import { DRUM, type Note, type Song } from '../song'

const lead: Note[] = []
const flute: Note[] = []
const strings: Note[] = []
const brass: Note[] = []
const bass: Note[] = []
const harp: Note[] = []
const timpani: Note[] = []
const drums: Note[] = []

// Local phrases use sixteenth positions; the articulation leaves breath before the next attack.
function phrase(target: Note[], bar: number, notes: Note[], strength = 1) {
  for (const [step, pitch, length, velocity = 0.8] of notes) {
    target.push([bar * 16 + step, pitch, length * 0.94, velocity * strength])
  }
}

const theme: Note[][] = [
  [[0, 74, 2, 0.93], [2, 78, 2, 0.82], [4, 81, 4, 0.96], [8, 76, 2, 0.8], [10, 78, 2, 0.84], [12, 74, 4, 0.87]],
  [[0, 81, 8, 0.92], [10, 79, 2, 0.74], [12, 78, 2, 0.78], [14, 76, 2, 0.75]],
  [[0, 79, 6, 0.9], [6, 78, 2, 0.76], [8, 76, 4, 0.83], [12, 74, 4, 0.8]],
  [[0, 73, 4, 0.85], [4, 76, 2, 0.76], [6, 78, 2, 0.8], [8, 76, 6, 0.9]],
  [[0, 78, 2, 0.85], [2, 81, 2, 0.81], [4, 83, 6, 0.95], [10, 81, 2, 0.8], [12, 78, 4, 0.86]],
  [[0, 80, 4, 0.91], [4, 78, 2, 0.78], [6, 76, 2, 0.77], [8, 74, 4, 0.86], [12, 71, 4, 0.76]],
  [[0, 79, 6, 0.87], [6, 77, 2, 0.79], [8, 74, 4, 0.82], [12, 70, 4, 0.74]],
  [[0, 73, 4, 0.85], [4, 76, 4, 0.84], [8, 81, 6, 0.94], [14, 73, 2, 0.71]],
]
const answer: Note[][] = [
  [[0, 76, 6, 0.84], [6, 78, 2, 0.72], [8, 79, 4, 0.82], [12, 83, 4, 0.85]],
  [[0, 81, 4, 0.85], [4, 79, 2, 0.74], [6, 78, 2, 0.76], [8, 76, 6, 0.82]],
  [[0, 78, 8, 0.87], [10, 76, 2, 0.74], [12, 74, 4, 0.8]],
  [[0, 73, 4, 0.81], [4, 76, 4, 0.8], [8, 78, 4, 0.86], [12, 82, 4, 0.87]],
  [[0, 83, 6, 0.94], [6, 81, 2, 0.8], [8, 78, 4, 0.86], [12, 74, 4, 0.78]],
  [[0, 74, 4, 0.84], [4, 79, 4, 0.88], [8, 78, 2, 0.76], [10, 76, 2, 0.75], [12, 74, 4, 0.83]],
  [[0, 76, 4, 0.84], [4, 80, 4, 0.88], [8, 83, 6, 0.94], [14, 80, 2, 0.79]],
  [[0, 81, 4, 0.93], [4, 79, 4, 0.83], [8, 76, 4, 0.82], [12, 73, 2, 0.78]],
]
// [bass, inner voicing]; voicings intentionally stay below the solo trumpet.
const harmonyA: [number, number[]][] = [
  [38, [57, 62, 66]], [37, [57, 61, 64]], [35, [55, 59, 62]], [33, [57, 61, 64]],
  [35, [54, 59, 62]], [40, [56, 59, 62]], [43, [55, 58, 62]], [33, [55, 61, 64]],
]
const harmonyB: [number, number[]][] = [
  [40, [55, 59, 64]], [33, [55, 61, 64]], [38, [54, 57, 62]], [42, [54, 58, 61]],
  [35, [54, 59, 62]], [43, [55, 59, 62]], [40, [56, 59, 62]], [33, [55, 61, 64]],
]

// An upward brass summons, answered by a dominant timpani pickup. These two bars never repeat.
phrase(lead, 0, [[0, 62, 3, 0.82], [4, 69, 3, 0.86], [8, 74, 6, 0.93]])
phrase(lead, 1, [[0, 78, 3, 0.91], [4, 76, 3, 0.85], [8, 73, 4, 0.86]])
for (const [bar, chord] of [[0, [50, 57, 66]], [1, [45, 55, 61]]] as const) {
  for (const pitch of chord) brass.push([bar * 16, pitch, 12, 0.78])
  timpani.push([bar * 16, bar === 0 ? 38 : 33, 5, 0.88])
}
for (let i = 0; i < 6; i++) timpani.push([24 + i, 45, 1.5, 0.35 + i * 0.07])
for (const [i, pitch] of [62, 66, 69, 74, 78, 81].entries()) harp.push([i * 2, pitch, 5, 0.63])

for (let section = 0; section < 3; section++) {
  const start = 2 + section * 8
  const chords = section === 1 ? harmonyB : harmonyA
  for (let bar = 0; bar < 8; bar++) {
    const absolute = start + bar
    const step = absolute * 16
    const [root, voicing] = chords[bar]
    const energy = section === 1 ? 0.83 : section === 2 ? 1 : 0.92
    phrase(lead, absolute, (section === 1 ? answer : theme)[bar], energy)
    for (const [voice, pitch] of voicing.entries()) {
      strings.push([step + voice * 0.045, pitch, 15.7, (0.58 + voice * 0.035) * energy])
      if (section !== 1 || bar >= 4) {
        brass.push([step + 6, pitch + 12, 1.5, 0.39 * energy], [step + 12, pitch + 12, 2.5, 0.48 * energy])
      }
    }
    bass.push([step, root, 5.6, 0.85 * energy], [step + 6, root + 12, 1.7, 0.59 * energy])
    bass.push([step + 8, root, 3.5, 0.76 * energy], [step + 12, root + 12, 3.4, 0.66 * energy])
    if (section === 1 || section === 2) {
      const upper = section === 1 ? voicing[1] + 12 : voicing[2] + 12
      flute.push([step + 2, upper, 5.3, 0.62], [step + 10, voicing[0] + 12, 5.2, 0.56])
    }
    if (bar % 2 === 0) {
      for (let i = 0; i < 4; i++) harp.push([step + 1 + i * 2, voicing[i % 3] + 24, 4, 0.38 + i * 0.025])
    }
    for (let beat = 0; beat < 4; beat++) {
      drums.push([step + beat * 4, beat % 2 ? DRUM.snare : DRUM.kick, 1, (beat % 2 ? 0.69 : 0.85) * energy])
      drums.push([step + beat * 4, DRUM.hatClosed, 0.7, (beat % 2 ? 0.38 : 0.47) * energy])
      drums.push([step + beat * 4 + 2, DRUM.hatClosed, 0.7, (0.28 + (beat % 3) * 0.035) * energy])
    }
    if (bar % 2 === 0) drums.push([step + 10, DRUM.kick, 1, 0.61 * energy])
    if (bar === 0) drums.push([step, DRUM.crash, 5, 0.59 * energy])
    if (bar === 3 || bar === 7) {
      drums.push([step + 13, DRUM.snare, 0.6, 0.32], [step + 14, DRUM.tomHigh, 1, 0.56])
      drums.push([step + 15, DRUM.tomLow, 1, 0.64])
      timpani.push([step + 12, root, 3, 0.62], [step + 15, root + 12, 2, 0.45])
    }
  }
}

export default {
  title: 'A Thousand Faces, One Adventure',
  bpm: 132,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: 26 * 16,
  loopStart: 2 * 16,
  room: 0.65,
  echoBeats: 0.75,
  echoFeedback: 0.2,
  parts: [
    { inst: 'trumpet', notes: lead, vol: 0.56, pan: -0.07, reverb: 0.19, echo: 0.055 },
    { inst: 'flute', notes: flute, vol: 0.36, pan: 0.27, reverb: 0.26 },
    { inst: 'strings', notes: strings, vol: 0.27, pan: -0.25, reverb: 0.31 },
    { inst: 'brass', notes: brass, vol: 0.24, pan: 0.16, reverb: 0.22 },
    { inst: 'bass_finger', notes: bass, vol: 0.43, pan: 0, reverb: 0.04 },
    { inst: 'harp', notes: harp, vol: 0.25, pan: 0.4, reverb: 0.33, echo: 0.12 },
    { inst: 'timpani', notes: timpani, vol: 0.35, pan: -0.13, reverb: 0.26 },
    { inst: 'drums', notes: drums, vol: 0.39, pan: 0, reverb: 0.1 },
  ],
} satisfies Song
