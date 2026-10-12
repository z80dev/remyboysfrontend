import type { Note } from '../../../quest/music/song'
import type { Song } from '../../kit'

// Original 32-bar mission cue: D minor pedal, flat-second incursion,
// rising sequence and dominant tension resolving back into the opening pedal.
const ostinato: Note[] = []
const bass: Note[] = []
const lead: Note[] = []
const pads: Note[] = []
const drums: Note[] = []
const roots = [38, 38, 34, 36, 38, 39, 43, 45]
const cells = [[0, 7, 12, 3, 7, 15, 12, 7], [0, 7, 13, 3, 7, 12, 10, 7]]

for (let bar = 0; bar < 32; bar++) {
  const at = bar * 16
  const root = roots[bar % 8]
  const stage = Math.floor(bar / 8)
  const cell = cells[stage % 2]
  for (let step = 0; step < 16; step++) {
    // C-sharp pickup at the seam resolves into the opening D pedal.
    const pitch = bar === 31 && step === 15 ? 61 : root + 24 + cell[step % 8]
    ostinato.push([at + step, pitch, 0.65, step % 4 === 0 ? 0.65 : 0.38])
    if (step % 2 === 0) drums.push([at + step, 42, 0.8, step % 4 === 0 ? 0.42 : 0.24])
  }
  for (const step of [0, 6, 8, 14]) bass.push([at + step, root + (step === 14 ? 12 : 0), 1.6, 0.68])
  for (const interval of [0, 3, 7]) pads.push([at, root + 12 + interval, 15.5, 0.38])
  drums.push([at, 36, 1, 0.7], [at + 8, 36, 1, 0.58], [at + 4, 38, 1, 0.55], [at + 12, 38, 1, 0.65])
  if (stage >= 1 && bar % 2 === 0) lead.push([at + 2, root + 36, 3.5, 0.6], [at + 8, root + 43, 3.5, 0.62], [at + 12, root + 39, 3.5, 0.58])
  if (stage === 2) lead.push([at, root + 48, 1.5, 0.52], [at + 6, root + 46, 1.5, 0.48])
  if (bar % 8 === 7) {
    for (let step = 12; step < 16; step++) drums.push([at + step, step < 14 ? 45 : 38, 0.7, 0.42 + (step - 12) * 0.07])
  }
  if (bar % 8 === 0) drums.push([at, 49, 3, 0.3])
}

export const missionTheme: Song = {
  title: 'Mission', bpm: 132, stepsPerBeat: 4, beatsPerBar: 4,
  length: 32 * 16, loopStart: 0, room: 0.38, echoBeats: 0.75, echoFeedback: 0.18,
  parts: [
    { inst: 'square', notes: ostinato, vol: 0.15, pan: 0.22, reverb: 0.1, echo: 0.1 },
    { inst: 'bass_saw', notes: bass, vol: 0.23, reverb: 0.02 },
    { inst: 'saw_lead', notes: lead, vol: 0.23, pan: -0.15, reverb: 0.22 },
    { inst: 'strings', notes: pads, vol: 0.13, reverb: 0.3 },
    { inst: 'drums', notes: drums, vol: 0.25, reverb: 0.07 },
  ],
}
