import { DRUM, type Note, type Part, type Song } from '../song'

/**
 * The Last Rug — D minor, 160 BPM. Four-bar once-only summons; 40-bar / 60-second loop:
 * A8 (the corrupted oath), A'8, heroic F-major B8, Phrygian bridge8, final A''8.
 * The shared title signature D–F#–A / E–F#–D / A becomes D–F–A / E–F–D / A.
 * Its rising third returns in the original heroic counter-theme, not in any borrowed tune.
 * Bb and Eb shadow the tonic; A7 supplies C# at cadences. Root-only bass avoids low fifth mud,
 * upper chord inversions retain common tones, and 3+3+2 stabs push against the straight backbeat.
 */
const brass: Note[] = []
const violin: Note[] = []
const strings: Note[] = []
const staccato: Note[] = []
const choir: Note[] = []
const bass: Note[] = []
const timpani: Note[] = []
const hits: Note[] = []
const drums: Note[] = []

const chords = {
  dm: { root: 38, notes: [57, 62, 65] },
  bb: { root: 46, notes: [58, 62, 65] },
  gm: { root: 43, notes: [58, 62, 67] },
  a7: { root: 45, notes: [55, 61, 64] },
  eb: { root: 39, notes: [58, 63, 67] },
  c: { root: 48, notes: [55, 60, 64] },
  f: { root: 41, notes: [57, 60, 65] },
  ce: { root: 40, notes: [55, 60, 64] },
} as const
const progression: (keyof typeof chords)[] = [
  'dm', 'bb', 'gm', 'a7', 'eb', 'dm', 'bb', 'a7',
  'dm', 'c', 'bb', 'a7', 'gm', 'eb', 'a7', 'a7',
  'f', 'ce', 'dm', 'bb', 'gm', 'c', 'f', 'a7',
  'dm', 'eb', 'dm', 'eb', 'gm', 'bb', 'eb', 'a7',
  'dm', 'bb', 'gm', 'a7', 'eb', 'bb', 'a7', 'a7',
]

type Phrase = [number, number, number][]
const oath: Phrase[] = [
  [[0, 74, 2], [2, 77, 2], [4, 81, 4], [8, 76, 2], [10, 77, 2], [12, 74, 4]],
  [[0, 81, 7], [8, 82, 2], [10, 81, 2], [12, 77, 3]],
  [[0, 79, 3], [3, 77, 3], [6, 74, 2], [10, 70, 2], [12, 74, 3]],
  [[0, 76, 3], [4, 73, 3], [8, 69, 3], [12, 73, 2], [14, 76, 2]],
  [[0, 75, 3], [3, 79, 3], [6, 82, 4], [12, 79, 3]],
  [[0, 81, 4], [6, 77, 2], [8, 76, 2], [10, 74, 5]],
  [[0, 77, 2], [2, 81, 2], [4, 82, 4], [8, 81, 2], [10, 77, 2], [12, 74, 3]],
  [[0, 73, 3], [4, 76, 3], [8, 79, 3], [12, 76, 2], [14, 73, 2]],
]
const pursuit: Phrase[] = [
  oath[0],
  [[0, 79, 4], [6, 76, 2], [8, 72, 4], [12, 76, 3]],
  [[0, 77, 2], [2, 74, 2], [4, 70, 4], [8, 74, 2], [10, 77, 2], [12, 81, 3]],
  [[0, 79, 3], [4, 76, 2], [6, 73, 2], [8, 69, 3], [12, 73, 3]],
  [[0, 74, 3], [4, 79, 3], [8, 82, 4], [12, 81, 3]],
  [[0, 79, 3], [4, 75, 3], [8, 70, 3], [12, 75, 3]],
  [[0, 73, 2], [2, 76, 2], [4, 79, 3], [8, 81, 3], [12, 85, 3]],
  [[0, 88, 5], [8, 85, 3], [12, 81, 3]],
]
const hero: Phrase[] = [
  [[0, 77, 5], [6, 81, 2], [8, 84, 5], [14, 81, 2]],
  [[0, 79, 3], [4, 76, 3], [8, 84, 7]],
  [[0, 81, 5], [6, 77, 2], [8, 86, 5], [14, 84, 2]],
  [[0, 82, 6], [8, 81, 3], [12, 77, 3]],
  [[0, 79, 3], [4, 82, 3], [8, 86, 5], [14, 82, 2]],
  [[0, 84, 5], [6, 79, 2], [8, 76, 3], [12, 79, 3]],
  [[0, 81, 4], [4, 84, 4], [8, 89, 5], [14, 84, 2]],
  [[0, 85, 5], [6, 81, 2], [8, 79, 3], [12, 76, 3]],
]
const bridge: Phrase[] = [
  [[0, 74, 7], [10, 77, 3]],
  [[0, 75, 7], [10, 79, 3]],
  [[0, 77, 5], [6, 76, 2], [10, 74, 4]],
  [[0, 75, 5], [8, 70, 5]],
  [[0, 74, 3], [4, 79, 3], [8, 82, 6]],
  [[0, 81, 3], [4, 77, 3], [8, 74, 6]],
  [[0, 75, 3], [4, 79, 3], [8, 82, 3], [12, 79, 3]],
  [[0, 81, 3], [4, 79, 3], [8, 76, 3], [12, 73, 3]],
]
const finale: Phrase[] = [
  oath[0], oath[1], oath[2], oath[3], oath[4],
  [[0, 82, 3], [4, 81, 3], [8, 77, 3], [12, 74, 3]],
  [[0, 73, 2], [2, 76, 2], [4, 81, 4], [8, 79, 2], [10, 76, 2], [12, 73, 3]],
  [[0, 69, 5], [8, 73, 2], [10, 76, 2], [12, 73, 3]],
]
const melody = [...oath, ...pursuit, ...hero, ...bridge, ...finale]

// Four bars of tower bells, breath, then a tightening orchestral summons.
for (let bar = 0; bar < 4; bar++) {
  const start = bar * 16
  const chord = chords[(['dm', 'eb', 'gm', 'a7'] as const)[bar]]
  for (const pitch of chord.notes) choir.push([start, pitch, 15.6, 0.5 + bar * 0.06])
  timpani.push([start, chord.root, 5, 0.75], [start + 8, chord.root, 4, 0.6])
  if (bar === 0 || bar === 3) hits.push([start, chord.root + 24, 4, 0.78])
  if (bar > 0) {
    for (let beat = 0; beat < 4; beat++) {
      strings.push([start + beat * 4, chord.notes[beat % 3] + 12, 3.2, 0.55 + beat * 0.04])
    }
  }
  if (bar === 3) {
    for (let step = 8; step < 16; step++) {
      drums.push([start + step, DRUM.snare, 0.8, 0.34 + (step - 8) * 0.065])
      timpani.push([start + step, step % 2 ? 45 : 40, 1, 0.44 + (step - 8) * 0.04])
    }
  }
}

for (let bar = 0; bar < progression.length; bar++) {
  const start = (bar + 4) * 16
  const chord = chords[progression[bar]]
  const heroic = bar >= 16 && bar < 24
  const suspended = bar >= 24 && bar < 28
  const intensity = suspended ? 0.69 : heroic ? 0.86 : 0.81
  const lead = heroic || suspended ? violin : brass
  for (let i = 0; i < melody[bar].length; i++) {
    const [step, pitch, duration] = melody[bar][i]
    lead.push([start + step, pitch, duration - 0.18, intensity - (i % 3) * 0.035])
  }
  for (let i = 0; i < 8; i++) {
    if (suspended && i % 2) continue
    bass.push([start + i * 2, chord.root + (i === 3 || i === 7 ? 12 : 0), 1.65, i % 2 ? 0.64 : 0.81])
  }
  for (const pitch of chord.notes) {
    strings.push([start + 0.08, pitch + 12, 15.75, heroic ? 0.52 : suspended ? 0.4 : 0.43])
    if (bar % 2 === 0 || heroic || bar >= 32) choir.push([start + 0.12, pitch, 15.65, heroic ? 0.57 : 0.5])
  }
  // 3+3+2 sixteenth accents, answered in the second half; softened beneath the heroic line.
  for (const step of suspended ? [0, 6, 12] : [0, 3, 6, 8, 11, 14]) {
    const index = step % 3
    staccato.push([start + step, chord.notes[index] + 12, 1.3, heroic ? 0.46 : 0.66])
    if (!suspended && step % 2 === 0) {
      staccato.push([start + step + 0.035, chord.notes[(index + 1) % 3] + 12, 1.25, 0.4])
    }
  }
  // Contrary, longer inner lines leave the main signature intelligible.
  if (bar < 16 || bar >= 32) {
    const top = chord.notes[2] + 12
    violin.push([start + 4, top, 5.5, 0.53], [start + 11, chord.notes[1] + 12, 4.7, 0.47])
  } else if (heroic) {
    brass.push([start, chord.notes[0] + 12, 6.5, 0.55], [start + 8, chord.notes[1] + 12, 6.8, 0.51])
  }
  timpani.push([start, chord.root, 3.5, 0.71])
  if (!suspended) timpani.push([start + 10, chord.root, 2.5, 0.5])
  if (bar % 8 === 0) {
    hits.push([start, chord.root + 24, 4, heroic ? 0.68 : 0.76])
    drums.push([start, DRUM.crash, 5, 0.68])
  }
  for (const step of suspended ? [0, 10] : [0, 6, 8, 11]) drums.push([start + step, DRUM.kick, 1.2, step ? 0.7 : 0.89])
  for (const step of [4, 12]) drums.push([start + step + 0.025, DRUM.snare, 1.8, suspended ? 0.49 : 0.81])
  for (let step = 0; step < 16; step += 2) {
    drums.push([start + step + 0.04, heroic ? DRUM.ride : DRUM.hatClosed, 0.9, step % 4 ? 0.32 : 0.47])
  }
  if (bar % 8 === 7) {
    const fill = [DRUM.snare, DRUM.tomHigh, DRUM.tomMid, DRUM.tomLow]
    for (let i = 0; i < fill.length; i++) drums.push([start + 12 + i, fill[i], 1.2, 0.63 + i * 0.06])
    timpani.push([start + 14, 40, 1.5, 0.62], [start + 15, 45, 1.5, 0.73])
  }
}

const parts: Part[] = [
  { inst: 'brass', notes: brass, vol: 0.54, pan: -0.08, reverb: 0.24, echo: 0.04 },
  { inst: 'violin', notes: violin, vol: 0.5, pan: 0.14, reverb: 0.32, echo: 0.07 },
  { inst: 'strings', notes: strings, vol: 0.28, pan: -0.22, reverb: 0.37 },
  { inst: 'strings_stacc', notes: staccato, vol: 0.34, pan: 0.28, reverb: 0.22 },
  { inst: 'choir', notes: choir, vol: 0.34, pan: 0.04, reverb: 0.43 },
  { inst: 'bass_saw', notes: bass, vol: 0.47, pan: 0, reverb: 0.06 },
  { inst: 'timpani', notes: timpani, vol: 0.43, pan: -0.12, reverb: 0.3 },
  { inst: 'orch_hit', notes: hits, vol: 0.58, pan: 0, reverb: 0.36 },
  { inst: 'drums', notes: drums, vol: 0.47, pan: 0.05, reverb: 0.17 },
]

const song: Song = {
  title: 'The Last Rug',
  bpm: 160,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: 44 * 16,
  loopStart: 4 * 16,
  room: 0.7,
  echoBeats: 0.75,
  echoFeedback: 0.21,
  parts,
}

export default song
