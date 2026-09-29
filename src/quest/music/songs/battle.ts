/**
 * Wild Current — E minor, 160 BPM. One-bar alarm/run → A (8) → F# minor lift (8)
 * → G-major/half-time bridge (4) → compressed E-minor return (4), then back to A.
 * Hook: B–E–F#–G, answered by falling thirds on B7. The fourth and leading-tone turn
 * survive the key lift; C#7 launches it, B7 turns the bridge and loop home.
 * Inner chord voices move by step; bass stays separate from the staccato midrange.
 * Timing: 1.5-second intro + 36-second loop. Calibrated through the engine's stereo master.
 */
import { DRUM, type Note, type Song } from '../song'

const lead: Note[] = []
const answer: Note[] = []
const bass: Note[] = []
const brass: Note[] = []
const strings: Note[] = []
const pad: Note[] = []
const drums: Note[] = []
const timpani: Note[] = []

type Bar = { root: number; chord: number[]; tune: number[] }
const bars: Bar[] = [
  { root: 40, chord: [55, 59, 64], tune: [71, 76, 78, 79, 78, 76, 74] },
  { root: 36, chord: [55, 60, 64], tune: [76, 79, 83, 81, 79, 78, 76] },
  { root: 45, chord: [57, 60, 64], tune: [81, 79, 76, 74, 76, 79, 78] },
  { root: 35, chord: [57, 59, 63], tune: [78, 75, 71, 75, 78, 81, 75] },
  { root: 40, chord: [55, 59, 64], tune: [71, 76, 78, 79, 83, 81, 79] },
  { root: 43, chord: [55, 59, 62], tune: [79, 78, 74, 71, 74, 78, 79] },
  { root: 45, chord: [57, 60, 64], tune: [81, 79, 76, 79, 81, 83, 84] },
  { root: 37, chord: [56, 61, 65], tune: [85, 83, 80, 77, 73, 77, 80] },
  { root: 42, chord: [57, 61, 66], tune: [73, 78, 80, 81, 80, 78, 76] },
  { root: 38, chord: [57, 62, 66], tune: [78, 81, 85, 83, 81, 80, 78] },
  { root: 47, chord: [59, 62, 66], tune: [83, 81, 78, 76, 78, 81, 80] },
  { root: 37, chord: [59, 61, 65], tune: [80, 77, 73, 77, 80, 83, 77] },
  { root: 42, chord: [57, 61, 66], tune: [78, 80, 81, 85, 83, 81, 80] },
  { root: 38, chord: [57, 62, 66], tune: [81, 78, 74, 78, 81, 83, 85] },
  { root: 47, chord: [57, 62, 66], tune: [83, 81, 78, 76, 74, 78, 81] },
  { root: 38, chord: [54, 60, 62], tune: [78, 76, 74, 72, 69, 72, 78] },
  { root: 43, chord: [55, 59, 62], tune: [79, 78, 74, 71] },
  { root: 36, chord: [55, 59, 64], tune: [76, 79, 78, 76] },
  { root: 45, chord: [55, 60, 64], tune: [81, 79, 76, 74] },
  { root: 35, chord: [57, 59, 63], tune: [75, 78, 81, 75] },
  { root: 40, chord: [55, 59, 64], tune: [71, 76, 78, 79, 78, 76, 74] },
  { root: 36, chord: [55, 60, 64], tune: [76, 79, 83, 81, 79, 78, 76] },
  { root: 45, chord: [57, 60, 64], tune: [81, 79, 76, 74, 76, 79, 78] },
  { root: 35, chord: [57, 59, 63], tune: [78, 75, 71, 69, 71, 75, 78] },
]

// A crooked, original alarm: two rising attacks followed by an octave-and-a-half fall.
for (const [step, pitch, len, vel] of [
  [0, 76, 1.4, 0.92], [2, 83, 1.4, 0.97], [4, 88, 1.6, 1],
  [6, 86, 0.8, 0.9], [7, 83, 0.8, 0.87], [8, 81, 0.8, 0.84],
  [9, 79, 0.8, 0.88], [10, 78, 0.8, 0.82], [11, 75, 0.8, 0.86],
  [12, 74, 0.8, 0.8], [13, 71, 0.8, 0.84], [14, 69, 0.8, 0.81], [15, 75, 0.8, 0.91],
]) lead.push([step, pitch, len, vel])
for (const step of [0, 2, 4]) {
  for (const pitch of [52, 59, 64]) brass.push([step, pitch, 1.25, 0.8])
  drums.push([step, DRUM.kick, 0.8, 0.95])
}
drums.push([0, DRUM.crash, 4, 0.75])
for (let step = 8; step < 16; step++) drums.push([step, DRUM.snare, 0.5, 0.45 + (step - 8) * 0.06])
timpani.push([0, 40, 3, 0.8], [8, 47, 2, 0.65], [12, 47, 2, 0.82])

bars.forEach(({ root, chord, tune }, bar) => {
  const at = 16 + bar * 16
  const bridge = bar >= 16 && bar < 20
  const lifted = bar >= 8 && bar < 16
  const accents = bridge ? [0, 5, 8, 12] : [0, 2, 5, 7, 10, 12, 14]
  const lengths = bridge ? [4.4, 2.4, 3.4, 3.3] : [1.6, 2.5, 1.4, 2.5, 1.5, 1.5, 1.7]
  tune.forEach((pitch, index) => {
    lead.push([at + accents[index], pitch, lengths[index], (bridge ? 0.79 : 0.9) - (index % 3) * 0.055])
  })

  // Root/octave propulsion; a leading step on beat four connects actual chord roots.
  const nextRoot = bars[(bar + 1) % bars.length].root
  const pickup = nextRoot > root ? nextRoot - 1 : nextRoot + 1
  const bassPattern = bridge
    ? [[0, root, 5.8], [8, root + 12, 2.8], [12, root, 2.6], [15, pickup, 0.8]]
    : [[0, root, 1.6], [2, root + 12, 1.4], [4, root, 1.6], [6, root, 0.8],
      [7, root + 12, 0.8], [8, root, 1.6], [10, root + 12, 1.3], [12, root, 1.7], [15, pickup, 0.8]]
  bassPattern.forEach(([step, pitch, len], index) => bass.push([at + step, pitch, len, 0.86 - (index % 3) * 0.07]))

  if (bridge) {
    for (const pitch of chord) pad.push([at, pitch + 12, 15, 0.66])
    const response = [chord[1] + 12, chord[2] + 12, chord[1] + 12]
    response.forEach((pitch, index) => answer.push([at + 3 + index * 4, pitch, 1.6, 0.68 - index * 0.045]))
  } else {
    for (const step of [0, 6, 10]) {
      chord.forEach((pitch, voice) => strings.push([at + step, pitch + 12, 1.2, 0.61 + voice * 0.025]))
    }
    for (const step of lifted ? [0, 7, 12] : [0, 10]) {
      chord.forEach((pitch, voice) => brass.push([at + step, pitch, 1.8, 0.64 + voice * 0.035]))
    }
  }

  for (const step of bridge ? [0, 10] : [0, 6, 8, 14]) drums.push([at + step, DRUM.kick, 0.7, 0.89])
  for (const step of bridge ? [8] : [4, 12]) drums.push([at + step, DRUM.snare, 0.65, 0.88])
  const hatSpacing = bridge ? 2 : 1
  for (let step = 0; step < 16; step += hatSpacing) {
    drums.push([at + step, step === 14 && !bridge ? DRUM.hatOpen : DRUM.hatClosed, 0.5,
      step % 4 === 0 ? 0.46 : step % 2 === 0 ? 0.34 : 0.23])
  }
  if ([0, 8, 16, 20].includes(bar)) drums.push([at, DRUM.crash, 3, bar === 16 ? 0.48 : 0.68])
  if (bar % 4 === 3) {
    const fill = bar === 15 || bar === 23 ? [DRUM.snare, DRUM.tomHigh, DRUM.tomMid, DRUM.tomLow] : [DRUM.snare, DRUM.snare]
    fill.forEach((pitch, index) => drums.push([at + 16 - fill.length + index, pitch, 0.6, 0.53 + index * 0.09]))
  }
})

export default {
  title: 'Wild Current', bpm: 160, stepsPerBeat: 4, beatsPerBar: 4,
  length: 400, loopStart: 16, room: 0.3, echoBeats: 0.75, echoFeedback: 0.14,
  parts: [
    { inst: 'saw_lead', notes: lead, vol: 0.56, pan: -0.06, reverb: 0.12, echo: 0.09 },
    { inst: 'square', notes: answer, vol: 0.36, pan: 0.25, reverb: 0.17 },
    { inst: 'bass_saw', notes: bass, vol: 0.48, pan: 0, reverb: 0.015 },
    { inst: 'brass', notes: brass, vol: 0.32, pan: -0.22, reverb: 0.14 },
    { inst: 'strings_stacc', notes: strings, vol: 0.3, pan: 0.3, reverb: 0.18 },
    { inst: 'strings', notes: pad, vol: 0.24, pan: 0.1, reverb: 0.24 },
    { inst: 'drums', notes: drums, vol: 0.5, pan: 0, reverb: 0.075 },
    { inst: 'timpani', notes: timpani, vol: 0.38, pan: -0.12, reverb: 0.22 },
  ],
} satisfies Song
