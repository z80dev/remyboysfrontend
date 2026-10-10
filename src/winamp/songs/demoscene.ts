import { DRUM, type Note, type Song } from '../../quest/music/song'

/**
 * "Keygen Sunrise" — A minor, 136 BPM, an Amiga-MOD/keygen chiptune.
 * Four "channels" in spirit: 32nd-note tracker chord arpeggios, an octave-jumping pulse bass, a 25% pulse lead with
 * dotted-8th echo, and a breakbeat. A tracker echo channel (the lead copied three steps late, panned opposite)
 * doubles the hook in the repeats.
 * Intro (8 bars) → loop of 48 bars (≈85 s): A (hook) → A′ (+echo channel) → B → B′ (+echo channel, pad)
 * → break (glockenspiel hook over sparse kicks, snare build) → A″ (lead doubled an octave down).
 * A: Am F C G | Am F G E.  B: F G Em Am | Dm G C E.
 */
type Chord = [bass: number, tones: number[]]
const Am: Chord = [33, [57, 60, 64, 69]]
const F: Chord = [29, [57, 60, 65, 69]]
const C: Chord = [36, [55, 60, 64, 67]]
const G: Chord = [31, [55, 59, 62, 67]]
const E: Chord = [28, [56, 59, 64, 68]]
const Em: Chord = [28, [55, 59, 64, 67]]
const Dm: Chord = [38, [57, 62, 65, 69]]
const progressionA = [Am, F, C, G, Am, F, G, E]
const progressionB = [F, G, Em, Am, Dm, G, C, E]

// Bar-local [step, midi, length, velocity]; 3+3+2 syncopation is the keygen signature.
const hook: Note[][] = [
  [[0, 81, 3, 0.9], [3, 79, 3, 0.82], [6, 76, 2, 0.8], [8, 72, 2, 0.78], [10, 74, 2, 0.8], [12, 76, 4, 0.86]],
  [[0, 77, 3, 0.88], [3, 76, 3, 0.8], [6, 72, 2, 0.78], [8, 69, 4, 0.82], [12, 72, 2, 0.78], [14, 74, 2, 0.8]],
  [[0, 76, 3, 0.88], [3, 74, 3, 0.8], [6, 72, 2, 0.78], [8, 79, 4, 0.86], [12, 76, 2, 0.78], [14, 79, 2, 0.82]],
  [[0, 83, 6, 0.92], [6, 81, 2, 0.8], [8, 79, 4, 0.84], [12, 74, 4, 0.8]],
  [[0, 81, 3, 0.9], [3, 79, 3, 0.82], [6, 76, 2, 0.8], [8, 72, 2, 0.78], [10, 74, 2, 0.8], [12, 76, 4, 0.86]],
  [[0, 77, 3, 0.88], [3, 76, 3, 0.8], [6, 77, 2, 0.8], [8, 81, 4, 0.88], [12, 84, 4, 0.92]],
  [[0, 83, 3, 0.9], [3, 81, 3, 0.82], [6, 79, 2, 0.8], [8, 74, 2, 0.78], [10, 79, 2, 0.8], [12, 83, 4, 0.88]],
  [[0, 80, 6, 0.9], [6, 76, 2, 0.78], [8, 71, 4, 0.8], [12, 80, 2, 0.82], [14, 83, 2, 0.86]],
]
const tune: Note[][] = [
  [[0, 84, 6, 0.92], [6, 81, 2, 0.8], [8, 77, 4, 0.82], [12, 81, 4, 0.84]],
  [[0, 83, 6, 0.9], [6, 79, 2, 0.8], [8, 74, 4, 0.8], [12, 79, 4, 0.84]],
  [[0, 79, 3, 0.84], [3, 83, 3, 0.86], [6, 88, 4, 0.94], [10, 86, 2, 0.84], [12, 83, 4, 0.86]],
  [[0, 84, 8, 0.9], [8, 81, 4, 0.82], [12, 76, 4, 0.8]],
  [[0, 77, 3, 0.84], [3, 81, 3, 0.86], [6, 86, 6, 0.94], [12, 84, 2, 0.84], [14, 81, 2, 0.82]],
  [[0, 83, 4, 0.88], [4, 79, 4, 0.82], [8, 86, 4, 0.9], [12, 83, 4, 0.86]],
  [[0, 84, 3, 0.9], [3, 79, 3, 0.8], [6, 76, 2, 0.78], [8, 79, 2, 0.8], [10, 84, 2, 0.86], [12, 88, 4, 0.94]],
  [[0, 83, 6, 0.9], [6, 80, 2, 0.8], [8, 76, 4, 0.82], [12, 83, 2, 0.84], [14, 80, 2, 0.82]],
]

const lead: Note[] = []
const echo: Note[] = []
const low: Note[] = []
const arp: Note[] = []
const bass: Note[] = []
const pad: Note[] = []
const bell: Note[] = []
const drums: Note[] = []

const UP_DOWN = [0, 1, 2, 3, 2, 1, 2, 3]
const RISING = [0, 1, 2, 3]

function phrase(target: Note[], bar: number, notes: Note[], shift = 0, strength = 1, transpose = 0) {
  for (const [step, pitch, length, velocity = 0.8] of notes) {
    target.push([bar * 16 + step + shift, pitch + transpose, length * 0.9, velocity * strength])
  }
}

function arpeggio(bar: number, [, tones]: Chord, pattern: number[], strength: number) {
  for (let i = 0; i < 32; i++) {
    const accent = i % 8 === 0 ? 1 : i % 2 ? 0.78 : 0.88
    arp.push([bar * 16 + i * 0.5, tones[pattern[i % pattern.length]], 0.42, 0.62 * accent * strength])
  }
}

function octaveBass(bar: number, [root]: Chord, strength: number) {
  for (let s = 0; s < 16; s += 2) {
    bass.push([bar * 16 + s, root + (s % 4 ? 12 : 0), 1.5, (s % 4 ? 0.66 : 0.86) * strength])
  }
}

function rollingBass(bar: number, [root]: Chord) {
  const shape = [0, 12, 0, 12, 7, 12, 0, 10]
  for (const [i, offset] of shape.entries()) bass.push([bar * 16 + i * 2, root + offset, 1.5, i % 2 ? 0.66 : 0.86])
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

// Intro: arpeggios alone, the bass joins at bar 2, kicks and hats at bar 4, a roll into the loop.
progressionA.forEach((chord, bar) => {
  arpeggio(bar, chord, RISING, 0.75 + bar * 0.03)
  if (bar >= 2) octaveBass(bar, chord, bar < 4 ? 0.75 : 0.9)
  if (bar >= 4) {
    for (let s = 0; s < 16; s += 4) drums.push([bar * 16 + s, DRUM.kick, 1, 0.85])
    for (let s = 2; s < 16; s += 4) drums.push([bar * 16 + s, DRUM.hatClosed, 0.6, 0.34])
  }
  pad.push(...chord[1].slice(0, 3).map((pitch): Note => [bar * 16, pitch, 15.5, 0.42]))
})
for (let i = 0; i < 8; i++) drums.push([7 * 16 + 8 + i, DRUM.snare, 0.5, 0.35 + i * 0.07])
lead.push([7 * 16 + 12, 76, 1.6, 0.7], [7 * 16 + 14, 80, 1.6, 0.76])

const LOOP = 8
const sections = ['A', 'A2', 'B', 'B2', 'break', 'A3'] as const
sections.forEach((section, index) => {
  const first = LOOP + index * 8
  const isB = section === 'B' || section === 'B2'
  const progression = isB ? progressionB : progressionA
  const melody = isB ? tune : hook
  for (let i = 0; i < 8; i++) {
    const bar = first + i
    const chord = progression[i]
    if (section === 'break') {
      arpeggio(bar, chord, RISING, 0.62)
      phrase(bell, bar, melody[i], 0, 0.8)
      bass.push([bar * 16, chord[0], 7.5, 0.72], [bar * 16 + 8, chord[0] + 12, 7.5, 0.6])
      pad.push(...chord[1].map((pitch): Note => [bar * 16, pitch, 15.5, 0.48]))
      drums.push([bar * 16, DRUM.kick, 1, 0.8], [bar * 16 + 10, DRUM.kick, 1, 0.55])
      for (let s = 2; s < 16; s += 4) drums.push([bar * 16 + s, DRUM.shaker, 0.5, 0.3])
      if (i === 0) drums.push([bar * 16, DRUM.crash, 6, 0.6])
      if (i === 6) for (let s = 0; s < 16; s += 2) drums.push([bar * 16 + s, DRUM.snare, 0.5, 0.3 + s * 0.015])
      if (i === 7) for (let s = 0; s < 16; s++) drums.push([bar * 16 + s, DRUM.snare, 0.5, 0.5 + s * 0.028])
      continue
    }
    arpeggio(bar, chord, UP_DOWN, section === 'A' ? 0.9 : 1)
    phrase(lead, bar, melody[i])
    if (section === 'A2' || section === 'B2') phrase(echo, bar, melody[i], 3, 0.55)
    if (section === 'A3') phrase(low, bar, melody[i], 0, 0.75, -12)
    if (isB) {
      rollingBass(bar, chord)
      drive(bar)
      if (section === 'B2') pad.push(...chord[1].map((pitch): Note => [bar * 16, pitch, 15.5, 0.4]))
    } else {
      octaveBass(bar, chord, 1)
      breakbeat(bar, section === 'A' ? 0.92 : 1)
    }
    if (i === 0 || (i === 4 && section !== 'A')) drums.push([bar * 16, DRUM.crash, 5, 0.62])
    if (i === 7) fill(bar)
  }
})

export default {
  title: 'Keygen Sunrise',
  bpm: 136,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: (LOOP + sections.length * 8) * 16,
  loopStart: LOOP * 16,
  room: 0.45,
  echoBeats: 0.75,
  echoFeedback: 0.36,
  parts: [
    { inst: 'square', notes: lead, vol: 0.62, pan: -0.08, reverb: 0.16, echo: 0.24 },
    { inst: 'square', notes: echo, vol: 0.42, pan: 0.45, reverb: 0.18 },
    { inst: 'square50', notes: low, vol: 0.4, pan: -0.3, reverb: 0.14 },
    { inst: 'square50', notes: arp, vol: 0.4, pan: 0.25, reverb: 0.16, echo: 0.12 },
    { inst: 'bass', notes: bass, vol: 0.6, pan: 0, reverb: 0.03 },
    { inst: 'pad', notes: pad, vol: 0.24, pan: -0.25, reverb: 0.4 },
    { inst: 'bell', notes: bell, vol: 0.5, pan: 0.15, reverb: 0.4, echo: 0.28 },
    { inst: 'drums', notes: drums, vol: 0.6, pan: 0, reverb: 0.08 },
  ],
} satisfies Song
