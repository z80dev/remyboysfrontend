import type { Note } from '../../../quest/music/song'
import type { Song } from '../../kit'

// Original 64-bar score in D: launch fanfare, two theme statements, orbital bridge,
// broad reprise and an A dominant turnaround. All timing is on the sixteenth grid.
const lead: Note[] = []
const telemetry: Note[] = []
const strings: Note[] = []
const bass: Note[] = []
const drums: Note[] = []
const harmony = [
  [50, 54, 57], [50, 54, 61], [47, 50, 54], [43, 47, 50],
  [52, 56, 59], [43, 47, 50], [45, 49, 52], [45, 49, 55],
]
const phrases = [
  [[0, 74, 3], [4, 78, 2], [6, 81, 2], [8, 85, 5], [14, 81, 2]],
  [[0, 83, 3], [4, 81, 2], [6, 78, 2], [8, 76, 3], [12, 78, 4]],
  [[0, 78, 4], [4, 81, 2], [6, 83, 2], [8, 86, 4], [12, 85, 4]],
  [[0, 83, 3], [4, 81, 2], [6, 78, 2], [8, 79, 6]],
  [[0, 80, 3], [4, 83, 2], [6, 86, 2], [8, 88, 4], [12, 86, 4]],
  [[0, 83, 4], [4, 79, 4], [8, 78, 3], [12, 76, 4]],
  [[0, 73, 2], [2, 76, 2], [4, 81, 4], [8, 83, 3], [12, 85, 4]],
  [[0, 83, 3], [4, 81, 3], [8, 76, 3], [12, 73, 3]],
]

for (let bar = 0; bar < 64; bar++) {
  const at = bar * 16
  const section = Math.floor(bar / 8)
  const h = harmony[bar % 8]
  const bridge = section === 4 || section === 5
  const quiet = section === 0 || section === 4
  for (const pitch of h) strings.push([at, pitch + 12, 15.5, quiet ? 0.42 : 0.55])
  for (let step = 0; step < 16; step += 2) {
    bass.push([at + step, h[0] - 12 + (step === 6 || step === 14 ? 12 : 0), 1.7, step % 4 === 0 ? 0.7 : 0.48])
    if (!quiet || step % 4 === 0) telemetry.push([at + step, h[(step / 2 + bar) % 3] + 24, 1.2, 0.35])
    drums.push([at + step, step === 14 && bar % 4 === 3 ? 46 : 42, 1, step % 4 === 0 ? 0.45 : 0.3])
  }
  drums.push([at, 36, 1, 0.72], [at + 8, 36, 1, 0.62], [at + 4, 38, 1, 0.54], [at + 12, 38, 1, 0.62])
  if (bar % 8 === 0) drums.push([at, 49, 4, 0.35])
  if (bar % 8 === 7) {
    for (let i = 0; i < 4; i++) drums.push([at + 12 + i, [48, 45, 41, 38][i], 1, 0.42 + i * 0.06])
  }
  if (section === 0) {
    // Spacious call before the first complete statement.
    if (bar % 2 === 0) lead.push([at, h[0] + 24, 3, 0.62], [at + 4, h[2] + 24, 3, 0.65], [at + 8, h[0] + 36, 6, 0.7])
  } else if (bridge) {
    // The bridge lead sits behind the sustained strings and table callouts.
    lead.push([at + 2, h[2] + 24, 5, 0.2], [at + 10, h[1] + 24, 5, 0.18])
    if (section === 5) lead.push([at + 8, h[0] + 36, 1.5, 0.2])
  } else {
    for (const [step, pitch, length] of phrases[bar % 8]) {
      const octave = section === 3 && bar % 8 < 4 ? 12 : 0
      lead.push([at + step, pitch + octave, length - 0.2, section === 6 ? 0.8 : 0.7])
    }
  }
}

export const baseCadetTheme: Song = {
  title: 'Base Cadet Theme', bpm: 132, stepsPerBeat: 4, beatsPerBar: 4,
  length: 64 * 16, loopStart: 0, room: 0.55, echoBeats: 0.75, echoFeedback: 0.22,
  parts: [
    { inst: 'saw_lead', notes: lead, vol: 0.31, pan: -0.08, reverb: 0.24, echo: 0.12 },
    { inst: 'square', notes: telemetry, vol: 0.12, pan: 0.28, reverb: 0.12, echo: 0.15 },
    { inst: 'strings', notes: strings, vol: 0.2, pan: -0.2, reverb: 0.35 },
    { inst: 'bass_saw', notes: bass, vol: 0.23, reverb: 0.02 },
    { inst: 'drums', notes: drums, vol: 0.25, reverb: 0.08 },
  ],
}
