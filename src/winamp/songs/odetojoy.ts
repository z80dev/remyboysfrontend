import { DRUM, type Note, type Song } from '../../quest/music/song'

/**
 * "Ode to Joy (Remy Keygen Mix)" — Beethoven, Symphony No. 9, finale theme, D major, 136 BPM Amiga-MOD / keygen.
 * Beethoven's 16 bars exactly, including the dotted cadences and the tied F♯ that anticipates the last phrase:
 * F♯ F♯ G A | A G F♯ E | D D E F♯ | F♯. E E | … | E E F♯ D | E F♯G F♯ D | E F♯G F♯ E | D E A F♯~ | F♯ G A | …
 * Pulse lead and 32nd-note pulse arpeggios over an octave-jumping bass, all through the tempo-synced echo.
 * Intro (4 bars: the first phrase on a bell over the arps) → loop of 56 bars (≈99 s): theme (16) → variation (16:
 * turns, trills, octave flicks and scale runs on the lead, the plain tune underneath) → break (8, the second half on
 * a bell, thin drums, snare build) → finale (16, lead + echo voice + a diatonic third below, drive beat).
 */
type Chord = [bass: number, tones: number[]]
const D: Chord = [38, [62, 66, 69, 74]]
const A: Chord = [33, [61, 64, 69, 73]]
const Bm: Chord = [35, [62, 66, 71, 74]]
const E7: Chord = [40, [62, 64, 68, 71]]

/** [midi, beats] — the whole 16-bar tune; bar 12's last F♯ is tied over the barline. */
const TUNE: [midi: number, beats: number][] = [
  [66, 1], [66, 1], [67, 1], [69, 1], [69, 1], [67, 1], [66, 1], [64, 1],
  [62, 1], [62, 1], [64, 1], [66, 1], [66, 1.5], [64, 0.5], [64, 2],
  [66, 1], [66, 1], [67, 1], [69, 1], [69, 1], [67, 1], [66, 1], [64, 1],
  [62, 1], [62, 1], [64, 1], [66, 1], [64, 1.5], [62, 0.5], [62, 2],
  [64, 1], [64, 1], [66, 1], [62, 1], [64, 1], [66, 0.5], [67, 0.5], [66, 1], [62, 1],
  [64, 1], [66, 0.5], [67, 0.5], [66, 1], [64, 1], [62, 1], [64, 1], [57, 1], [66, 2],
  [66, 1], [67, 1], [69, 1], [69, 1], [67, 1], [66, 1], [64, 1],
  [62, 1], [62, 1], [64, 1], [66, 1], [64, 1.5], [62, 0.5], [62, 2],
]
/** One chord per half bar. */
const HARMONY: Chord[] = [
  D, D, A, A, D, D, D, A,
  D, D, A, A, Bm, Bm, A, D,
  A, D, A, D, A, A, E7, A,
  D, D, A, A, D, Bm, A, D,
]

const SCALE: number[] = []
for (let midi = 24; midi < 110; midi++) if ([1, 2, 4, 6, 7, 9, 11].includes(midi % 12)) SCALE.push(midi)
const diatonic = (midi: number, steps: number) => SCALE[SCALE.indexOf(midi) + steps]

/** The tune as [step, midi, steps] from its start. */
const PLAIN: Note[] = []
{
  let step = 0
  for (const [midi, beats] of TUNE) {
    PLAIN.push([step, midi, beats * 4])
    step += beats * 4
  }
}

/** Tracker-style variation: turns on repeated notes, octave flicks on steps, runs into leaps, trills on long notes. */
const ORNATE: Note[] = []
TUNE.forEach(([midi, beats], i) => {
  const at = PLAIN[i][0]
  const next = TUNE[(i + 1) % TUNE.length][0]
  const up = diatonic(midi, 1)
  const down = diatonic(midi, -1)
  let figure: [midi: number, steps: number][]
  if (beats === 2) figure = [[midi, 1], [up, 1], [midi, 1], [up, 1], [midi, 1], [up, 1], [midi, 2]]
  else if (beats === 1.5) figure = [[midi, 1], [up, 1], [midi, 4]]
  else if (beats === 0.5) figure = [[midi, 2]]
  else if (next === midi) figure = [[midi, 1], [up, 1], [midi, 1], [down, 1]]
  else if (Math.abs(next - midi) <= 2) figure = [[midi, 2], [midi + 12, 1], [midi, 1]]
  else {
    const toward = next > midi ? -1 : 1
    figure = [[midi, 2], [diatonic(next, toward * 2), 1], [diatonic(next, toward), 1]]
  }
  let step = at
  for (const [pitch, steps] of figure) {
    ORNATE.push([step, pitch, steps, step === at ? 0.86 : 0.72])
    step += steps
  }
})

const lead: Note[] = []
const echo: Note[] = []
const low: Note[] = []
const third: Note[] = []
const arp: Note[] = []
const bass: Note[] = []
const pad: Note[] = []
const bell: Note[] = []
const drums: Note[] = []

/** Lays the tune's notes from `fromBar` (of 16) to `toBar` starting at song bar `bar`. */
function tune(target: Note[], bar: number, notes: Note[], fromBar: number, toBar: number, opts: {
  transpose?: number
  shift?: number
  strength?: number
  map?: (midi: number) => number
} = {}) {
  const { transpose = 0, shift = 0, strength = 1, map = (midi: number) => midi } = opts
  for (const [step, midi, length, velocity = 0.8] of notes) {
    if (step < fromBar * 16 || step >= toBar * 16) continue
    const at = bar * 16 + step - fromBar * 16 + shift
    target.push([at, map(midi) + transpose, length * 0.88, velocity * strength])
  }
}

const UP_DOWN = [0, 1, 2, 3, 2, 1, 2, 3]
const RISING = [0, 1, 2, 3]

function arpeggio(step: number, [, tones]: Chord, pattern: number[], strength: number) {
  for (let i = 0; i < 16; i++) {
    const accent = i % 8 === 0 ? 1 : i % 2 ? 0.78 : 0.88
    arp.push([step + i * 0.5, tones[pattern[i % pattern.length]], 0.42, 0.62 * accent * strength])
  }
}

function octaveBass(step: number, [root]: Chord, strength: number) {
  for (let s = 0; s < 8; s += 2) bass.push([step + s, root + (s % 4 ? 12 : 0), 1.5, (s % 4 ? 0.66 : 0.86) * strength])
}

function rollingBass(step: number, [root]: Chord) {
  for (const [i, offset] of [0, 12, 7, 12].entries()) bass.push([step + i * 2, root + offset, 1.5, i % 2 ? 0.66 : 0.86])
}

function breakbeat(bar: number, strength: number) {
  const at = bar * 16
  for (const s of [0, 6, 10]) drums.push([at + s, DRUM.kick, 1, (s ? 0.82 : 0.95) * strength])
  for (const s of [4, 12]) drums.push([at + s, DRUM.snare, 1, 0.84 * strength])
  for (let s = 0; s < 16; s += 2) {
    drums.push([at + s, s === 14 ? DRUM.hatOpen : DRUM.hatClosed, 0.6, (s % 4 ? 0.3 : 0.42) * strength])
  }
  drums.push([at + 15, DRUM.snare2, 0.5, 0.3 * strength])
}

function drive(bar: number) {
  const at = bar * 16
  for (let s = 0; s < 16; s += 4) drums.push([at + s, DRUM.kick, 1, 0.95])
  for (const s of [4, 12]) drums.push([at + s, DRUM.snare, 1, 0.82], [at + s, DRUM.clap, 1, 0.5])
  for (let s = 0; s < 16; s++) drums.push([at + s, DRUM.hatClosed, 0.5, s % 2 ? 0.22 : s % 4 ? 0.36 : 0.3])
}

function fill(bar: number) {
  const at = bar * 16
  for (const [i, sound] of [DRUM.tomHigh, DRUM.tomHigh, DRUM.tomMid, DRUM.tomLow].entries()) {
    drums.push([at + 12 + i, sound, 1, 0.62 + i * 0.07])
  }
}

/** Calls `each` for every half bar of tune bars `fromBar …` laid at song bar `bar`. */
function halves(bar: number, fromBar: number, count: number, each: (step: number, chord: Chord, half: number) => void) {
  for (let h = 0; h < count * 2; h++) each(bar * 16 + h * 8, HARMONY[fromBar * 2 + h], h)
}

// Intro: the first phrase on a bell over rising arpeggios; the bass joins at bar 2, a snare roll into the loop.
tune(bell, 0, PLAIN, 0, 4, { transpose: 12, strength: 0.8 })
halves(0, 0, 4, (step, chord, h) => {
  arpeggio(step, chord, RISING, 0.72 + h * 0.03)
  if (h >= 4) octaveBass(step, chord, 0.8)
  pad.push(...chord[1].slice(0, 3).map((pitch): Note => [step, pitch, 7.6, 0.4]))
})
for (let s = 2; s < 48; s += 4) drums.push([s, DRUM.hatClosed, 0.6, 0.26])
for (let i = 0; i < 16; i++) drums.push([48 + i, DRUM.snare, 0.5, 0.3 + i * 0.04])

const LOOP = 4
let bar = LOOP

// Theme: plain lead, octave bass, breakbeat.
tune(lead, bar, PLAIN, 0, 16, { transpose: 12 })
halves(bar, 0, 16, (step, chord) => {
  arpeggio(step, chord, UP_DOWN, 0.92)
  octaveBass(step, chord, 1)
})
for (let i = 0; i < 16; i++) {
  breakbeat(bar + i, 0.94)
  if (i % 4 === 0) drums.push([(bar + i) * 16, DRUM.crash, 5, i % 8 ? 0.5 : 0.64])
  if (i % 8 === 7) fill(bar + i)
}
bar += 16

// Variation: the ornamented lead over the plain tune an octave down, rolling bass and a driving beat.
tune(lead, bar, ORNATE, 0, 16, { transpose: 12 })
tune(low, bar, PLAIN, 0, 16, { strength: 0.72 })
halves(bar, 0, 16, (step, chord) => {
  arpeggio(step, chord, UP_DOWN, 0.95)
  rollingBass(step, chord)
})
for (let i = 0; i < 16; i++) {
  drive(bar + i)
  if (i % 8 === 0) drums.push([(bar + i) * 16, DRUM.crash, 5, 0.64])
  if (i % 8 === 7) fill(bar + i)
}
bar += 16

// Break: the second half on a bell over arps and pads, thin drums, a snare build into the finale.
tune(bell, bar, PLAIN, 8, 16, { transpose: 12, strength: 0.85 })
halves(bar, 8, 8, (step, chord, h) => {
  arpeggio(step, chord, RISING, 0.66)
  bass.push([step, chord[0], 7.5, 0.7])
  pad.push(...chord[1].map((pitch): Note => [step, pitch, 7.6, 0.42]))
  if (h % 2 === 0) drums.push([step, DRUM.kick, 1, 0.8])
  for (const s of [2, 6]) drums.push([step + s, DRUM.shaker, 0.5, 0.3])
})
drums.push([bar * 16, DRUM.crash, 6, 0.6])
for (let s = 0; s < 16; s += 2) drums.push([(bar + 6) * 16 + s, DRUM.snare, 0.5, 0.3 + s * 0.015])
for (let s = 0; s < 16; s++) drums.push([(bar + 7) * 16 + s, DRUM.snare, 0.5, 0.5 + s * 0.028])
bar += 8

// Finale: lead, a dotted-8th echo voice and a third below in harmony, octave bass, drive beat.
tune(lead, bar, PLAIN, 0, 16, { transpose: 12 })
tune(echo, bar, PLAIN, 0, 16, { transpose: 12, shift: 3, strength: 0.55 })
tune(third, bar, PLAIN, 0, 16, { transpose: 12, strength: 0.68, map: (midi) => diatonic(midi, -2) })
halves(bar, 0, 16, (step, chord, h) => {
  arpeggio(step, chord, UP_DOWN, 1)
  octaveBass(step, chord, 1)
  if (h % 4 === 0) pad.push(...chord[1].map((pitch): Note => [step, pitch, 15.5, 0.34]))
})
for (let i = 0; i < 16; i++) {
  if (i % 8 < 4) breakbeat(bar + i, 1)
  else drive(bar + i)
  if (i % 4 === 0) drums.push([(bar + i) * 16, DRUM.crash, 5, 0.62])
  if (i % 8 === 7) fill(bar + i)
}
bar += 16

export default {
  title: 'Ode to Joy (Remy Keygen Mix)',
  bpm: 136,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: bar * 16,
  loopStart: LOOP * 16,
  room: 0.45,
  echoBeats: 0.75,
  echoFeedback: 0.36,
  parts: [
    { inst: 'square', notes: lead, vol: 0.6, pan: -0.08, reverb: 0.16, echo: 0.24 },
    { inst: 'square', notes: echo, vol: 0.42, pan: 0.45, reverb: 0.18 },
    { inst: 'square50', notes: third, vol: 0.34, pan: 0.3, reverb: 0.16, echo: 0.12 },
    { inst: 'square50', notes: low, vol: 0.4, pan: -0.3, reverb: 0.14 },
    { inst: 'square50', notes: arp, vol: 0.38, pan: 0.25, reverb: 0.16, echo: 0.12 },
    { inst: 'bass', notes: bass, vol: 0.6, pan: 0, reverb: 0.03 },
    { inst: 'pad', notes: pad, vol: 0.24, pan: -0.25, reverb: 0.4 },
    { inst: 'bell', notes: bell, vol: 0.5, pan: 0.15, reverb: 0.4, echo: 0.28 },
    { inst: 'drums', notes: drums, vol: 0.6, pan: 0, reverb: 0.08 },
  ],
} satisfies Song
