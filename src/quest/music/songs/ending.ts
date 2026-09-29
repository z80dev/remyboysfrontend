/**
 * “Every Face, a Way Home” — D major, 84 BPM. Original credits companion to the title theme.
 * Identity motif: MIDI [74, 78, 81, 76, 78, 74, 81], sixteenth onsets [0, 2, 4, 8, 10, 12, 16],
 * lengths [2, 2, 4, 2, 2, 4, 8]. The opening stretches its rising triad into a memory.
 * Form: once-only solo piano introduction (4 bars); reflection (8), ascent (8), full reprise (4),
 * and a gentle homeward coda (4). 80 seconds first pass, 68.57-second loop beginning at reflection.
 * Bm → F#7/A# → Bm/A → E/G# is the ascent's chromatic bass; Gm6 supplies a tender borrowed iv.
 * Piano/harp remain exposed at first; strings, then choir, then brass arrive rather than just get louder.
 * Mix reference: 44.1 kHz offline intro + two loop passes, RMS 0.0764 / peak 0.4027 through the live master.
 */
import { DRUM, type Note, type Song } from '../song'

const piano: Note[] = []
const harp: Note[] = []
const strings: Note[] = []
const cello: Note[] = []
const choir: Note[] = []
const brass: Note[] = []
const trumpet: Note[] = []
const bass: Note[] = []
const timpani: Note[] = []
const drums: Note[] = []

function phrase(target: Note[], bar: number, notes: Note[], strength = 1) {
  for (const [step, pitch, length, velocity = 0.8] of notes) {
    target.push([bar * 16 + step, pitch, length * 0.96, velocity * strength])
  }
}

const reflection: Note[][] = [
  [[0, 74, 4, 0.76], [4, 78, 4, 0.72], [8, 81, 7, 0.84]],
  [[0, 76, 4, 0.72], [4, 78, 4, 0.75], [8, 74, 7, 0.77]],
  [[0, 81, 10, 0.86], [12, 79, 4, 0.7]],
  [[0, 78, 6, 0.78], [6, 76, 2, 0.63], [8, 73, 7, 0.71]],
  [[0, 74, 6, 0.76], [6, 78, 2, 0.69], [8, 83, 7, 0.87]],
  [[0, 81, 4, 0.79], [4, 80, 4, 0.75], [8, 76, 7, 0.72]],
  [[0, 79, 6, 0.82], [6, 77, 2, 0.66], [8, 74, 7, 0.73]],
  [[0, 73, 6, 0.72], [8, 76, 4, 0.77], [12, 78, 2, 0.66]],
]
const ascent: Note[][] = [
  [[0, 78, 6, 0.81], [6, 81, 2, 0.74], [8, 83, 7, 0.87]],
  [[0, 85, 6, 0.91], [6, 82, 2, 0.77], [8, 78, 7, 0.82]],
  [[0, 83, 6, 0.88], [6, 81, 2, 0.74], [8, 78, 4, 0.81], [12, 74, 4, 0.73]],
  [[0, 76, 6, 0.83], [6, 78, 2, 0.74], [8, 80, 7, 0.85]],
  [[0, 79, 4, 0.83], [4, 81, 4, 0.86], [8, 83, 6, 0.9], [14, 81, 2, 0.73]],
  [[0, 79, 6, 0.86], [6, 77, 2, 0.72], [8, 76, 4, 0.8], [12, 74, 4, 0.78]],
  [[0, 78, 6, 0.89], [6, 81, 2, 0.81], [8, 86, 7, 0.94]],
  [[0, 85, 4, 0.89], [4, 83, 4, 0.83], [8, 81, 6, 0.87]],
]
const reprise: Note[][] = [
  [[0, 74, 2, 0.88], [2, 78, 2, 0.82], [4, 81, 4, 0.95], [8, 76, 2, 0.8], [10, 78, 2, 0.83], [12, 74, 4, 0.87]],
  [[0, 81, 8, 0.94], [10, 79, 2, 0.75], [12, 78, 2, 0.78], [14, 76, 2, 0.72]],
  [[0, 79, 6, 0.9], [6, 78, 2, 0.73], [8, 76, 4, 0.81], [12, 74, 4, 0.8]],
  [[0, 73, 4, 0.83], [4, 76, 4, 0.85], [8, 81, 7, 0.91]],
]
const coda: Note[][] = [
  [[0, 78, 6, 0.78], [8, 74, 7, 0.72]],
  [[0, 74, 6, 0.73], [8, 71, 7, 0.66]],
  [[0, 70, 6, 0.67], [8, 74, 7, 0.7]],
  [[0, 73, 7, 0.64], [8, 76, 5, 0.66]],
]
const reflectionHarmony: [number, number[]][] = [
  [38, [57, 62, 66]], [37, [57, 61, 64]], [35, [55, 59, 62]], [33, [57, 61, 64]],
  [35, [54, 59, 62]], [40, [56, 59, 62]], [43, [55, 58, 62]], [33, [55, 61, 64]],
]
const ascentHarmony: [number, number[]][] = [
  [35, [54, 59, 62]], [34, [54, 58, 61]], [33, [54, 59, 62]], [32, [56, 59, 64]],
  [31, [55, 59, 62]], [31, [55, 58, 64]], [30, [54, 57, 62]], [33, [55, 61, 64]],
]
const homeHarmony: [number, number[]][] = [
  ...reflectionHarmony.slice(0, 4),
  [38, [57, 62, 66]], [35, [55, 59, 62]], [43, [55, 58, 62]], [33, [57, 61, 64]],
]

// A deliberately unaccompanied piano: thumb, two quiet inner voices, then the first remembered call.
for (let bar = 0; bar < 4; bar++) {
  const [root, voicing] = reflectionHarmony[bar]
  piano.push([bar * 16, root + 12, 12, 0.55])
  for (const [i, pitch] of voicing.entries()) piano.push([bar * 16 + 2 + i * 2, pitch, 8, 0.42 + i * 0.035])
}
phrase(piano, 0, [[8, 74, 4, 0.72], [12, 78, 4, 0.69]])
phrase(piano, 1, [[0, 81, 8, 0.81], [10, 76, 6, 0.68]])
phrase(piano, 2, [[0, 78, 6, 0.73], [8, 74, 7, 0.69]])
phrase(piano, 3, [[0, 73, 7, 0.63], [8, 69, 6, 0.59]])

for (let section = 0; section < 3; section++) {
  const harmony = section === 0 ? reflectionHarmony : section === 1 ? ascentHarmony : homeHarmony
  for (let bar = 0; bar < 8; bar++) {
    const absolute = 4 + section * 8 + bar
    const step = absolute * 16
    const [root, voicing] = harmony[bar]
    const closing = section === 2 && bar >= 4
    const energy = section === 0 ? 0.66 + bar * 0.025 : section === 1 ? 0.8 + bar * 0.023 : 1 - Math.max(0, bar - 3) * 0.095
    const melody = section === 0 ? reflection[bar] : section === 1 ? ascent[bar] : bar < 4 ? reprise[bar] : coda[bar - 4]
    phrase(piano, absolute, melody, section === 2 && !closing ? 0.74 : 1)
    if (section === 2 && !closing) phrase(trumpet, absolute, melody, 0.89)
    for (const [voice, pitch] of voicing.entries()) {
      // Staggered hands and unequal velocities keep the pulse alive without mechanically quantized chords.
      piano.push([step + 2 + voice * 2 + voice * 0.04, pitch, 7, (0.43 + voice * 0.035) * energy])
      piano.push([step + 10 + voice * 2 + voice * 0.04, pitch, 5, (0.37 + voice * 0.035) * energy])
      strings.push([step + voice * 0.065, pitch, 16.15, (0.58 + voice * 0.025) * energy])
      if (section === 1 || (section === 2 && bar < 6)) {
        choir.push([step + 0.15, pitch + 12, 15.7, (0.48 + voice * 0.035) * energy])
      }
      if (section === 2 && bar < 4) brass.push([step + 0.08, pitch, 12, 0.59])
    }
    bass.push([step, root + 12, 14.8, 0.69 * energy])
    if (section > 0 && !closing) bass.push([step + 8, root, 7.3, 0.66 * energy])
    if (section === 0 || closing) {
      // A low, contrary-motion reply occupies the spaces left by the piano, not its register.
      cello.push([step + 8, voicing[1], 7.2, 0.49 * energy])
    } else {
      cello.push([step + 1, voicing[2], 6, 0.6], [step + 8, voicing[1], 7, 0.57])
    }
    for (let i = 0; i < (closing ? 3 : 6); i++) {
      const pitch = voicing[i % 3] + (i < 3 ? 12 : 24)
      harp.push([step + 1 + i * 2, pitch, 5.5, (0.42 + (i % 3) * 0.035) * energy])
    }
    if (section === 1 || (section === 2 && bar < 4)) {
      drums.push([step, DRUM.kick, 1, 0.59 * energy], [step + 8, DRUM.kick, 1, 0.44 * energy])
      drums.push([step + 4, DRUM.rim, 1, 0.43 * energy], [step + 12, DRUM.snare, 1, 0.48 * energy])
      for (let beat = 0; beat < 4; beat++) drums.push([step + beat * 4 + 2, DRUM.shaker, 1, (0.25 + (beat % 2) * 0.065) * energy])
      if (bar === 0) drums.push([step, DRUM.crash, 6, 0.37 * energy])
      if (bar === 7 || (section === 2 && bar === 3)) timpani.push([step + 8, root + 12, 5, 0.51])
    }
  }
}

export default {
  title: 'Every Face, a Way Home',
  bpm: 84,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: 28 * 16,
  loopStart: 4 * 16,
  room: 0.78,
  echoBeats: 0.75,
  echoFeedback: 0.17,
  parts: [
    { inst: 'piano', notes: piano, vol: 0.55, pan: -0.08, reverb: 0.28, echo: 0.025 },
    { inst: 'harp', notes: harp, vol: 0.24, pan: 0.36, reverb: 0.35, echo: 0.065 },
    { inst: 'strings', notes: strings, vol: 0.28, pan: -0.27, reverb: 0.36 },
    { inst: 'violin', notes: cello, vol: 0.24, pan: 0.2, reverb: 0.27 },
    { inst: 'choir', notes: choir, vol: 0.24, pan: 0.21, reverb: 0.4 },
    { inst: 'brass', notes: brass, vol: 0.24, pan: -0.17, reverb: 0.31 },
    { inst: 'trumpet', notes: trumpet, vol: 0.49, pan: 0.02, reverb: 0.28 },
    { inst: 'bass_finger', notes: bass, vol: 0.36, pan: 0, reverb: 0.07 },
    { inst: 'timpani', notes: timpani, vol: 0.3, pan: -0.12, reverb: 0.3 },
    { inst: 'drums', notes: drums, vol: 0.27, pan: 0, reverb: 0.14 },
  ],
} satisfies Song
