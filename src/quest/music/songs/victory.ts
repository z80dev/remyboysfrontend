/**
 * Pocketful of Starlight — D major, 128 BPM. Two-bar brass fanfare → A (8)
 * → answering B (4) → homecoming/cadence (4); the 30-second loop begins at bar 3.
 * A quotes the original title motif D–F#–A / E–F#–D / A. Bell replies and a
 * walking finger bass make it bounce. F#7 tonicizes B minor; borrowed Bbmaj7
 * adds a warm surprise before G/A–A7 leads seamlessly back to D.
 * Timing: 3.75-second intro + 30-second loop. Calibrated through the engine's stereo master.
 */
import { DRUM, type Note, type Song } from '../song'

const square: Note[] = []
const trumpet: Note[] = []
const bells: Note[] = []
const brass: Note[] = []
const piano: Note[] = []
const bass: Note[] = []
const drums: Note[] = []

type Phrase = [step: number, pitch: number, length: number][]
const phrases: Phrase[] = [
  [[0, 74, 1.8], [2, 78, 1.8], [4, 81, 3.6], [8, 76, 1.8], [10, 78, 1.8], [12, 74, 3.6]],
  [[0, 81, 7.4], [9, 78, 1.5], [11, 76, 1.5], [13, 74, 2.5]],
  [[0, 79, 2.7], [3, 78, 0.8], [4, 76, 2.7], [8, 74, 2.7], [11, 71, 1.5], [13, 74, 2.5]],
  [[0, 73, 3.5], [4, 76, 1.6], [6, 79, 1.6], [8, 81, 3.6], [12, 76, 3.4]],
  [[0, 74, 1.8], [2, 78, 1.8], [4, 81, 3.6], [8, 83, 2.7], [11, 81, 1.5], [13, 78, 2.5]],
  [[0, 78, 2.7], [3, 77, 0.8], [4, 78, 3.6], [8, 82, 3.7], [12, 85, 3.2]],
  [[0, 83, 5.6], [6, 81, 1.5], [8, 78, 2.7], [11, 76, 1.5], [13, 74, 2.5]],
  [[0, 73, 2.7], [3, 74, 0.8], [4, 76, 3.5], [8, 79, 2.5], [12, 76, 1.5], [14, 78, 1.5]],
  [[0, 79, 3.6], [4, 83, 2.7], [7, 81, 0.8], [8, 79, 3.6], [12, 78, 3.3]],
  [[0, 78, 5.6], [6, 76, 1.5], [8, 74, 3.6], [12, 73, 3.3]],
  [[0, 71, 1.7], [2, 74, 1.7], [4, 78, 3.4], [8, 76, 3.4], [12, 74, 1.6], [14, 71, 1.5]],
  [[0, 73, 3.5], [4, 76, 3.5], [8, 79, 3.5], [12, 81, 2.7]],
  [[0, 81, 1.7], [2, 78, 1.7], [4, 74, 3.5], [8, 76, 1.7], [10, 78, 1.7], [12, 81, 3.4]],
  [[0, 82, 3.5], [4, 81, 3.5], [8, 77, 3.5], [12, 74, 3.4]],
  [[0, 79, 3.5], [4, 78, 1.5], [6, 76, 1.5], [8, 74, 5.7]],
  [[0, 73, 3.5], [4, 76, 1.5], [6, 79, 1.5], [8, 81, 3.4], [12, 73, 2.3]],
]
const harmony = [
  { root: 38, chord: [57, 62, 66] }, { root: 35, chord: [57, 62, 66] },
  { root: 43, chord: [55, 59, 62] }, { root: 45, chord: [55, 61, 64] },
  { root: 38, chord: [57, 62, 66] }, { root: 42, chord: [58, 61, 64] },
  { root: 35, chord: [59, 62, 66] }, { root: 45, chord: [55, 61, 64] },
  { root: 43, chord: [55, 59, 62] }, { root: 42, chord: [57, 62, 66] },
  { root: 40, chord: [55, 59, 62] }, { root: 45, chord: [55, 61, 64] },
  { root: 38, chord: [57, 62, 66] }, { root: 46, chord: [57, 62, 65] },
  { root: 45, chord: [55, 59, 62] }, { root: 45, chord: [55, 61, 64] },
]

// Fanfare has its own rhythm, not the loop hook: dotted calls, then a dominant flourish.
for (const [step, pitch, len] of [
  [0, 74, 2.5], [3, 74, 0.7], [4, 78, 3.3], [8, 81, 5.5], [14, 78, 1.5],
  [16, 79, 2.5], [19, 78, 0.7], [20, 76, 3.3], [24, 73, 2.5], [27, 76, 0.7],
  [28, 79, 1.5], [30, 81, 1.5],
]) {
  trumpet.push([step, pitch, len, step < 16 ? 0.94 : 0.86])
  bells.push([step, pitch + 12, Math.min(len, 2.5), 0.57])
}
for (const [step, pitches] of [[0, [57, 62, 66]], [8, [57, 62, 66]], [16, [55, 61, 64]], [24, [55, 61, 64]]] as const) {
  for (const pitch of pitches) brass.push([step, pitch, 6.5, 0.72])
  bass.push([step, step < 16 ? 38 : 45, 5.5, 0.86])
  drums.push([step, DRUM.kick, 0.8, 0.83])
}
drums.push([0, DRUM.crash, 4, 0.64], [8, DRUM.snare, 1, 0.78], [24, DRUM.snare, 1, 0.76])
for (let step = 28; step < 32; step++) drums.push([step, DRUM.snare, 0.6, 0.43 + (step - 28) * 0.1])

harmony.forEach(({ root, chord }, bar) => {
  const at = 32 + bar * 16
  const answering = bar >= 8 && bar < 12
  const melody = answering ? trumpet : square
  phrases[bar].forEach(([step, pitch, len], index) => {
    melody.push([at + step, pitch, len, (answering ? 0.84 : 0.82) - (index % 3) * 0.05])
  })

  // Light chord inversions on the offbeats, rather than dense block chords under every note.
  for (const step of [2, 6, 10, 14]) {
    chord.forEach((pitch, voice) => piano.push([at + step + voice * 0.035, pitch, 1.7, 0.55 + voice * 0.045]))
  }
  if (bar % 4 === 0 || bar >= 12) {
    for (const pitch of chord) {
      brass.push([at, pitch, bar === 13 ? 7 : 3.3, bar >= 12 ? 0.64 : 0.57])
      if (bar !== 13) brass.push([at + 8, pitch, 2.8, 0.49])
    }
  }
  const nextRoot = harmony[(bar + 1) % harmony.length].root
  const approach = nextRoot === root ? root + 2 : nextRoot + (nextRoot > root ? -1 : 1)
  const bassLine = [[0, root, 3.2], [4, root + 12, 2.5], [8, root + 7, 3.2], [12, root + 12, 1.7], [14, approach, 1.6]]
  bassLine.forEach(([step, pitch, len], index) => bass.push([at + step, pitch, len, index % 2 === 0 ? 0.85 : 0.73]))

  // Bell replies sit in the lead's longer breaths; the last two bars deliberately simplify.
  if (bar < 14) {
    const pitches = bar % 2 === 0 ? [chord[2] + 24, chord[1] + 24] : [chord[1] + 24, chord[2] + 24]
    pitches.forEach((pitch, index) => bells.push([at + 9 + index * 4, pitch, 1.9, 0.54 - index * 0.045]))
  } else if (bar === 14) bells.push([at + 8, 86, 4, 0.6])

  for (const step of [0, 8]) drums.push([at + step, DRUM.kick, 0.7, 0.73])
  for (const step of [4, 12]) {
    drums.push([at + step, DRUM.snare, 0.7, 0.6], [at + step, DRUM.tambourine, 0.7, 0.38])
  }
  for (let step = 0; step < 16; step += 2) drums.push([at + step, DRUM.hatClosed, 0.5, step % 4 === 0 ? 0.36 : 0.27])
  if (bar === 0 || bar === 12) drums.push([at, DRUM.crash, 3, 0.48])
  if (bar % 4 === 3) drums.push([at + 14, DRUM.snare, 0.5, 0.37], [at + 15, DRUM.snare, 0.5, 0.48])
})

export default {
  title: 'Pocketful of Starlight', bpm: 128, stepsPerBeat: 4, beatsPerBar: 4,
  length: 288, loopStart: 32, swing: 0.035, room: 0.38, echoBeats: 0.75, echoFeedback: 0.12,
  parts: [
    { inst: 'square', notes: square, vol: 0.51, pan: -0.06, reverb: 0.17, echo: 0.07 },
    { inst: 'trumpet', notes: trumpet, vol: 0.53, pan: 0.08, reverb: 0.22 },
    { inst: 'bell', notes: bells, vol: 0.34, pan: 0.3, reverb: 0.27, echo: 0.09 },
    { inst: 'brass', notes: brass, vol: 0.36, pan: -0.23, reverb: 0.2 },
    { inst: 'piano', notes: piano, vol: 0.38, pan: 0.18, reverb: 0.18 },
    { inst: 'bass_finger', notes: bass, vol: 0.58, pan: 0, reverb: 0.025 },
    { inst: 'drums', notes: drums, vol: 0.47, pan: 0, reverb: 0.1 },
  ],
} satisfies Song
