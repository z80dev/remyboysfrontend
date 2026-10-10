import { DRUM, type Note, type Song } from '../../quest/music/song'

/**
 * "Rainy Skin Loader" — C major/A minor, 85 BPM with lazy 16th swing, a trip-hop/lounge cool-down.
 * Rootless Rhodes voicings (maj9/m9/13/7♯9) strummed on the beat and pushed on the swung "a", a finger bass that
 * walks into each chord by a chromatic approach, a dusty boom-bap kit (quiet snare, ghost hats, shaker), a breathy
 * flute melody and a sine whistle in the middle eight.
 * Intro (2 bars) → loop of 32 bars (≈90 s): A (flute) → B (whistle) → A′ (flute, new ending, music-box sprinkles)
 * → C (drums thin to rim and shaker, bell figures, the flute floats long tones, kit fills back in).
 * A: Fmaj9 Em9 Dm9 Cmaj9 | Fmaj9 Em9 Dm9 G13.  B: Am9 D9 Fmaj9 E7♯9 | Am9 D9 B♭maj9 G13.  C: Dm9 Em9 Fmaj9 G13 ×2.
 */
type Chord = [bass: number, voicing: number[]]
const Fmaj9: Chord = [41, [57, 60, 64, 67]]
const Em9: Chord = [40, [55, 59, 62, 66]]
const Dm9: Chord = [38, [53, 57, 60, 64]]
const Cmaj9: Chord = [36, [52, 55, 59, 62]]
const G13: Chord = [31, [53, 57, 59, 64]]
const Am9: Chord = [33, [55, 59, 60, 64]]
const D9: Chord = [38, [54, 57, 60, 64]]
const E7s9: Chord = [40, [56, 62, 67, 71]]
const Bbmaj9: Chord = [34, [57, 60, 62, 65]]
const progressionA = [Fmaj9, Em9, Dm9, Cmaj9, Fmaj9, Em9, Dm9, G13]
const progressionB = [Am9, D9, Fmaj9, E7s9, Am9, D9, Bbmaj9, G13]
const progressionC = [Dm9, Em9, Fmaj9, G13, Dm9, Em9, Fmaj9, G13]

const melodyA: Note[][] = [
  [[2, 76, 2, 0.7], [4, 79, 6, 0.8], [12, 77, 2, 0.68], [14, 76, 2, 0.7]],
  [[0, 74, 8, 0.78], [10, 71, 2, 0.66], [12, 74, 2, 0.7], [14, 79, 2, 0.74]],
  [[0, 77, 6, 0.8], [6, 76, 2, 0.7], [8, 72, 4, 0.72], [13, 74, 3, 0.7]],
  [[0, 71, 10, 0.76], [12, 67, 2, 0.64], [14, 69, 2, 0.68]],
  [[0, 72, 2, 0.7], [2, 76, 2, 0.72], [4, 79, 4, 0.8], [8, 81, 4, 0.82], [12, 79, 2, 0.72], [14, 84, 2, 0.78]],
  [[0, 83, 6, 0.84], [6, 79, 2, 0.72], [8, 78, 4, 0.76], [12, 74, 4, 0.72]],
  [[0, 77, 4, 0.78], [4, 76, 2, 0.7], [6, 74, 2, 0.7], [8, 72, 4, 0.74], [12, 69, 2, 0.66], [14, 72, 2, 0.7]],
  [[0, 71, 8, 0.76], [10, 74, 2, 0.68], [12, 76, 4, 0.74]],
]
const endingA: Note[][] = [
  [[0, 84, 4, 0.82], [4, 81, 2, 0.74], [6, 79, 2, 0.72], [8, 76, 6, 0.78], [14, 79, 2, 0.7]],
  [[0, 79, 4, 0.78], [4, 78, 2, 0.72], [6, 76, 2, 0.7], [8, 74, 8, 0.76]],
  [[0, 77, 2, 0.74], [2, 76, 2, 0.7], [4, 74, 2, 0.7], [6, 72, 2, 0.7], [8, 69, 4, 0.72], [12, 72, 4, 0.72]],
  [[0, 71, 6, 0.76], [6, 74, 2, 0.7], [8, 77, 4, 0.76], [12, 76, 4, 0.72]],
]
const melodyB: Note[][] = [
  [[0, 76, 4, 0.74], [4, 79, 2, 0.72], [6, 81, 6, 0.8], [14, 79, 2, 0.68]],
  [[0, 78, 6, 0.78], [6, 76, 2, 0.7], [8, 74, 4, 0.72], [12, 72, 4, 0.7]],
  [[0, 76, 8, 0.78], [8, 79, 4, 0.74], [12, 84, 4, 0.8]],
  [[0, 83, 6, 0.82], [6, 80, 2, 0.72], [8, 79, 4, 0.76], [12, 74, 4, 0.72]],
  [[0, 72, 2, 0.7], [2, 76, 2, 0.72], [4, 79, 4, 0.78], [8, 83, 4, 0.8], [12, 81, 4, 0.76]],
  [[0, 78, 8, 0.78], [8, 81, 4, 0.76], [12, 84, 4, 0.8]],
  [[0, 86, 6, 0.84], [6, 84, 2, 0.74], [8, 81, 4, 0.76], [12, 77, 4, 0.72]],
  [[0, 79, 8, 0.78], [8, 76, 4, 0.72], [12, 74, 4, 0.7]],
]

const flute: Note[] = []
const whistle: Note[] = []
const keys: Note[] = []
const bass: Note[] = []
const sprinkle: Note[] = []
const bell: Note[] = []
const pad: Note[] = []
const drums: Note[] = []

function phrase(target: Note[], bar: number, notes: Note[], strength = 1) {
  for (const [step, pitch, length, velocity = 0.8] of notes) {
    target.push([bar * 16 + step, pitch, length * 0.95, velocity * strength])
  }
}

function strum(bar: number, step: number, pitches: number[], length: number, velocity: number) {
  pitches.forEach((pitch, i) => keys.push([bar * 16 + step + i * 0.07, pitch, length, velocity + i * 0.02]))
}

function comp(bar: number, [, voicing]: Chord, variant: number) {
  if (variant % 2) {
    strum(bar, 0, voicing, 10, 0.5)
    strum(bar, 11, voicing.slice(1), 4.5, 0.42)
  } else {
    strum(bar, 0, voicing, 6.5, 0.54)
    strum(bar, 7, voicing.slice(2), 2.5, 0.38)
    strum(bar, 10, voicing, 5.5, 0.46)
  }
}

function walk(bar: number, [root]: Chord, next: Chord, sparse = false) {
  const at = bar * 16
  const target = next[0]
  bass.push([at, root, sparse ? 9 : 5.5, 0.82])
  if (!sparse) bass.push([at + 6, root + 12, 1.2, 0.5], [at + 10, root + 7, 3, 0.66])
  const approach = target > root ? target - 1 : target + 1
  bass.push([at + 14, approach === root ? target - 1 : approach, 1.8, 0.6])
}

function kit(bar: number, variant: number) {
  const at = bar * 16
  for (const s of variant === 3 ? [0, 7, 10, 14] : [0, 7, 10]) drums.push([at + s, DRUM.kick, 1, s ? 0.66 : 0.82])
  for (const s of [4, 12]) drums.push([at + s, DRUM.snare, 1, 0.56], [at + s, DRUM.rim, 1, 0.24])
  for (let s = 0; s < 16; s += 2) {
    const open = variant === 3 && s === 14
    drums.push([at + s, open ? DRUM.hatOpen : DRUM.hatClosed, open ? 1.5 : 0.6, open ? 0.24 : s % 4 ? 0.2 : 0.3])
  }
  for (const s of [3, 11, 15]) drums.push([at + s, DRUM.hatClosed, 0.4, 0.13])
  for (let s = 1; s < 16; s += 2) drums.push([at + s, DRUM.shaker, 0.5, 0.12])
  if (variant === 1) drums.push([at + 13, DRUM.snare2, 0.5, 0.16])
}

function thinKit(bar: number) {
  const at = bar * 16
  drums.push([at, DRUM.kick, 1, 0.72], [at + 10, DRUM.kick, 1, 0.5])
  for (const s of [4, 12]) drums.push([at + s, DRUM.rim, 1, 0.42])
  for (let s = 0; s < 16; s++) drums.push([at + s, DRUM.shaker, 0.5, s % 2 ? 0.1 : 0.17])
}

// Intro: Rhodes alone on Cmaj9 → G13 with a shaker, the hats joining in bar 1.
comp(0, Cmaj9, 0)
comp(1, G13, 1)
for (let s = 0; s < 32; s++) drums.push([s, DRUM.shaker, 0.5, s % 2 ? 0.1 : 0.16])
for (let s = 16; s < 32; s += 2) drums.push([s, DRUM.hatClosed, 0.6, 0.18])
bass.push([24, 43, 3.5, 0.6], [28, 43, 1.8, 0.5], [30, 42, 1.8, 0.58])

const LOOP = 2
const sections = [
  { progression: progressionA, lead: flute, melody: melodyA },
  { progression: progressionB, lead: whistle, melody: melodyB },
  { progression: progressionA, lead: flute, melody: [...melodyA.slice(0, 4), ...endingA] },
  { progression: progressionC, lead: flute, melody: undefined },
]
const order = sections.flatMap((section) => section.progression)
sections.forEach(({ progression, lead, melody }, index) => {
  progression.forEach((chord, i) => {
    const bar = LOOP + index * 8 + i
    const next = order[(index * 8 + i + 1) % order.length]
    comp(bar, chord, i)
    if (melody) phrase(lead, bar, melody[i])
    if (index === 3) {
      walk(bar, chord, next, i % 2 === 0)
      if (i < 7) thinKit(bar)
      else kit(bar, 3)
      const top = chord[1].map((pitch) => pitch + 12)
      for (const [s, k] of [[0, 3], [3, 2], [6, 1], [8, 2], [11, 3], [14, 0]]) bell.push([bar * 16 + s, top[k], 3, 0.5])
      if (i >= 4) flute.push([bar * 16, chord[1][3] + 12, 7.5, 0.66], [bar * 16 + 8, chord[1][2] + 12, 7.5, 0.6])
      pad.push(...chord[1].map((pitch): Note => [bar * 16, pitch, 15.5, 0.4]))
    } else {
      walk(bar, chord, next)
      kit(bar, i % 4)
    }
    if (index === 1) pad.push(...chord[1].map((pitch): Note => [bar * 16, pitch, 15.5, 0.34]))
    if (index === 2 && i % 2 === 1) {
      for (const [s, k] of [[2, 3], [6, 2], [9, 3]]) sprinkle.push([bar * 16 + s, chord[1][k] + 24, 2, 0.4])
    }
    if (i === 0) drums.push([bar * 16, DRUM.ride, 4, 0.28])
  })
})

export default {
  title: 'Rainy Skin Loader',
  bpm: 85,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: (LOOP + sections.length * 8) * 16,
  loopStart: LOOP * 16,
  swing: 0.24,
  room: 0.55,
  echoBeats: 0.75,
  echoFeedback: 0.3,
  parts: [
    { inst: 'flute', notes: flute, vol: 0.64, pan: 0.12, reverb: 0.3, echo: 0.16 },
    { inst: 'whistle', notes: whistle, vol: 0.56, pan: 0.18, reverb: 0.32, echo: 0.2 },
    { inst: 'epiano', notes: keys, vol: 0.56, pan: -0.15, reverb: 0.26, echo: 0.06 },
    { inst: 'bass_finger', notes: bass, vol: 0.58, pan: 0, reverb: 0.04 },
    { inst: 'music_box', notes: sprinkle, vol: 0.3, pan: 0.4, reverb: 0.4, echo: 0.3 },
    { inst: 'bell', notes: bell, vol: 0.3, pan: 0.3, reverb: 0.4, echo: 0.24 },
    { inst: 'pad', notes: pad, vol: 0.18, pan: -0.3, reverb: 0.4 },
    { inst: 'drums', notes: drums, vol: 0.72, pan: 0, reverb: 0.1 },
  ],
} satisfies Song
