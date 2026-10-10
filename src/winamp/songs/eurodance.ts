import { DRUM, type Note, type Song } from '../../quest/music/song'

/**
 * "Hyperspace Hotline" — F minor, 138 BPM, a late-90s eurodance/trance anthem.
 * Four-on-the-floor kick with clap, open hats and offbeat saw bass under a gated square pluck; the "supersaw" stabs
 * are a brass + staccato-strings stack; the hook is a saw lead doubled an octave up by a pulse.
 * Intro (8 bars) → loop of 56 bars (≈97 s): verse (8) → hook (16) → breakdown (8, piano hook over strings and choir,
 * no drums) → build (8, snare roll from quarters to 32nds, kick and bass return) → hook (16, + choir and brass double).
 * Verse: Fm D♭ A♭ E♭ ×2. Hook: Fm D♭ A♭ E♭ | Fm D♭ E♭ C.
 */
type Chord = [bass: number, stab: number[], pad: number[]]
const Fm: Chord = [41, [65, 68, 72, 77], [53, 56, 60]]
const Db: Chord = [37, [65, 68, 73, 77], [53, 56, 61]]
const Ab: Chord = [44, [63, 68, 72, 75], [51, 56, 60]]
const Eb: Chord = [39, [63, 67, 70, 75], [51, 55, 58]]
const C: Chord = [36, [64, 67, 72, 76], [52, 55, 60]]
const verse = [Fm, Db, Ab, Eb, Fm, Db, Ab, Eb]
const chorus = [Fm, Db, Ab, Eb, Fm, Db, Eb, C]

const opening: Note[] = [
  [0, 77, 2, 0.84], [2, 80, 2, 0.84], [4, 84, 3, 0.94], [7, 82, 1, 0.78], [8, 80, 2, 0.84], [10, 82, 2, 0.84],
  [12, 84, 4, 0.9],
]
const hook: Note[][] = [
  opening,
  [[0, 85, 3, 0.94], [3, 84, 3, 0.86], [6, 80, 2, 0.82], [8, 77, 4, 0.86], [12, 80, 2, 0.82], [14, 82, 2, 0.84]],
  [[0, 84, 3, 0.92], [3, 80, 3, 0.84], [6, 84, 2, 0.86], [8, 87, 4, 0.94], [12, 85, 2, 0.86], [14, 84, 2, 0.84]],
  [[0, 82, 6, 0.9], [6, 79, 2, 0.8], [8, 75, 4, 0.84], [12, 79, 2, 0.82], [14, 82, 2, 0.86]],
  opening,
  [[0, 85, 3, 0.94], [3, 84, 3, 0.86], [6, 85, 2, 0.86], [8, 89, 4, 0.98], [12, 87, 2, 0.88], [14, 85, 2, 0.86]],
  [[0, 87, 3, 0.94], [3, 85, 3, 0.86], [6, 84, 2, 0.84], [8, 82, 2, 0.84], [10, 84, 2, 0.86], [12, 79, 4, 0.86]],
  [[0, 84, 4, 0.92], [4, 79, 2, 0.82], [6, 76, 2, 0.8], [8, 79, 4, 0.86], [12, 72, 2, 0.8], [14, 76, 2, 0.84]],
]

const lead: Note[] = []
const sparkle: Note[] = []
const double: Note[] = []
const pluck: Note[] = []
const brass: Note[] = []
const stabs: Note[] = []
const strings: Note[] = []
const choir: Note[] = []
const piano: Note[] = []
const bass: Note[] = []
const drone: Note[] = []
const drums: Note[] = []

function phrase(target: Note[], bar: number, notes: Note[], strength = 1, transpose = 0) {
  for (const [step, pitch, length, velocity = 0.8] of notes) {
    target.push([bar * 16 + step, pitch + transpose, length * 0.92, velocity * strength])
  }
}

const GATE = [0, 1, 2, 1, 3, 2, 1, 2, 0, 1, 2, 1, 3, 2, 3, 1]
function gated(bar: number, [, tones]: Chord, strength: number) {
  for (let s = 0; s < 16; s++) {
    pluck.push([bar * 16 + s, tones[GATE[s]], 0.7, (s % 4 === 2 ? 0.78 : s % 2 ? 0.55 : 0.66) * strength])
  }
}

function stab(bar: number, [, tones]: Chord, steps: number[], strength: number) {
  for (const s of steps) {
    const accent = s === 0 ? 1 : 0.84
    for (const pitch of tones) {
      brass.push([bar * 16 + s, pitch, 1.5, 0.72 * accent * strength])
      stabs.push([bar * 16 + s, pitch, 1.5, 0.78 * accent * strength])
    }
  }
}

function offbeatBass(bar: number, [root]: Chord, strength: number) {
  for (const s of [2, 6, 10, 14]) {
    bass.push([bar * 16 + s, root + (s === 14 ? 12 : 0), 1.7, (s === 14 ? 0.72 : 0.86) * strength])
  }
}

function beat(bar: number, opts: { clap?: boolean; open?: boolean; strength?: number } = {}) {
  const at = bar * 16
  const strength = opts.strength ?? 1
  for (let s = 0; s < 16; s += 4) drums.push([at + s, DRUM.kick, 1, 0.96 * strength])
  if (opts.clap) {
    for (const s of [4, 12]) {
      drums.push([at + s, DRUM.clap, 1, 0.78 * strength], [at + s, DRUM.snare, 1, 0.42 * strength])
    }
  }
  for (const s of [2, 6, 10, 14]) {
    const sound = opts.open ? DRUM.hatOpen : DRUM.hatClosed
    drums.push([at + s, sound, opts.open ? 1.2 : 0.6, (opts.open ? 0.36 : 0.42) * strength])
  }
  if (opts.open) for (const s of [1, 3, 5, 7, 9, 11, 13, 15]) drums.push([at + s, DRUM.hatClosed, 0.4, 0.2 * strength])
}

function lift(bar: number) {
  for (let s = 12; s < 16; s++) drums.push([bar * 16 + s, DRUM.snare, 0.5, 0.45 + (s - 12) * 0.1])
}

function sustain(target: Note[], bar: number, tones: number[], velocity: number, transpose = 0) {
  target.push(...tones.map((pitch): Note => [bar * 16, pitch + transpose, 15.6, velocity]))
}

// Intro: kick, hats and strings; clap, bass and pluck arrive at bar 4.
verse.forEach((chord, bar) => {
  beat(bar, { clap: bar >= 4, strength: bar < 4 ? 0.85 : 0.95 })
  sustain(strings, bar, chord[2], 0.5 + bar * 0.02, 12)
  if (bar >= 4) {
    offbeatBass(bar, chord, 0.9)
    gated(bar, chord, 0.6 + (bar - 4) * 0.08)
  }
})
lift(7)
drums.push([0, DRUM.crash, 6, 0.55])

const LOOP = 8
let bar = LOOP
// Verse: pluck riff, sparse stabs.
verse.forEach((chord, i) => {
  beat(bar, { clap: true, open: true })
  offbeatBass(bar, chord, 1)
  gated(bar, chord, 0.95)
  stab(bar, chord, [0, 10], 0.85)
  if (i === 0) drums.push([bar * 16, DRUM.crash, 6, 0.7])
  if (i === 7) lift(bar)
  bar++
})

function chorusBars(big: boolean) {
  for (let i = 0; i < 16; i++) {
    const chord = chorus[i % 8]
    beat(bar, { clap: true, open: true })
    offbeatBass(bar, chord, 1)
    gated(bar, chord, 0.75)
    stab(bar, chord, [0, 3, 6, 10, 12], 1)
    phrase(lead, bar, hook[i % 8])
    phrase(sparkle, bar, hook[i % 8], 0.7, 12)
    sustain(strings, bar, chord[2], 0.44, 12)
    if (big) {
      phrase(double, bar, hook[i % 8], 0.62, -12)
      sustain(choir, bar, chord[2], 0.5, 12)
    }
    if (i % 8 === 0) drums.push([bar * 16, DRUM.crash, 6, 0.75])
    if (i % 8 === 7) lift(bar)
    bar++
  }
}
chorusBars(false)

// Breakdown: drums out, the hook on piano over strings and choir.
chorus.forEach((chord, i) => {
  phrase(piano, bar, hook[i], 0.72, -12)
  sustain(strings, bar, chord[2], 0.56, 12)
  sustain(choir, bar, chord[2], 0.46)
  drone.push([bar * 16, chord[0], 15.6, 0.6])
  if (i === 0) drums.push([bar * 16, DRUM.crash, 8, 0.6])
  bar++
})

// Build: snare roll from quarters to 32nds, kick and bass back at the halfway point, a lead pickup into the hook.
chorus.forEach((chord, i) => {
  const at = bar * 16
  const spacing = i < 4 ? 4 : i < 6 ? 2 : i < 7 ? 1 : 0.5
  for (let s = 0; s < 16; s += spacing) {
    drums.push([at + s, DRUM.snare2, 0.45, Math.min(0.95, 0.3 + (i * 16 + s) / 200)])
  }
  gated(bar, chord, 0.5 + i * 0.06)
  sustain(strings, bar, chord[2], 0.5 + i * 0.03, 12)
  if (i >= 4) {
    for (let s = 0; s < 16; s += 4) drums.push([at + s, DRUM.kick, 1, 0.9])
    offbeatBass(bar, chord, 0.8)
    stab(bar, chord, [0], 0.7 + i * 0.03)
  } else {
    drone.push([at, chord[0], 15.6, 0.5])
  }
  bar++
})
phrase(lead, bar - 1, [[12, 72, 2, 0.8], [14, 75, 2, 0.86]])

chorusBars(true)

export default {
  title: 'Hyperspace Hotline',
  bpm: 138,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: bar * 16,
  loopStart: LOOP * 16,
  room: 0.6,
  echoBeats: 0.75,
  echoFeedback: 0.3,
  parts: [
    { inst: 'saw_lead', notes: lead, vol: 0.6, pan: 0, reverb: 0.2, echo: 0.2 },
    { inst: 'square', notes: sparkle, vol: 0.22, pan: 0.2, reverb: 0.22, echo: 0.2 },
    { inst: 'brass', notes: double, vol: 0.32, pan: -0.2, reverb: 0.2 },
    { inst: 'square50', notes: pluck, vol: 0.28, pan: 0.3, reverb: 0.14, echo: 0.3 },
    { inst: 'brass', notes: brass, vol: 0.2, pan: -0.25, reverb: 0.22 },
    { inst: 'strings_stacc', notes: stabs, vol: 0.22, pan: 0.25, reverb: 0.22 },
    { inst: 'strings', notes: strings, vol: 0.2, pan: -0.35, reverb: 0.4 },
    { inst: 'choir', notes: choir, vol: 0.24, pan: 0.35, reverb: 0.45 },
    { inst: 'piano', notes: piano, vol: 0.6, pan: 0.1, reverb: 0.35, echo: 0.22 },
    { inst: 'bass_saw', notes: bass, vol: 0.55, pan: 0, reverb: 0.03 },
    { inst: 'pad', notes: drone, vol: 0.3, pan: 0, reverb: 0.1 },
    { inst: 'drums', notes: drums, vol: 0.68, pan: 0, reverb: 0.07 },
  ],
} satisfies Song
