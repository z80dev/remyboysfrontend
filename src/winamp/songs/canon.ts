import { DRUM, type Note, type Song } from '../../quest/music/song'

/**
 * "Canon in D (Remy Trance Mix)" — Pachelbel, Canon in D, D major, 138 BPM 90s eurotrance anthem.
 * Pachelbel's ground D A B F♯ G D G A (D A Bm F♯m G D G A) at twice its note values — each bass note a half bar, the
 * two-bar ground a four-bar cycle — so the canon keeps its stately pace under a trance pulse. Over it the canon
 * voices enter one cycle apart with Pachelbel's own lines: F♯ E D C♯ B A B C♯ → D C♯ B A G F♯ G E → the eighths
 * D F♯ A G F♯ D F♯ E D B D A G B A G → the sixteenths D C♯ D D C♯ A E F♯ D D C♯ B C♯ F♯ A B | G F♯ E G F♯ E D C♯ …
 * Intro (8 bars: the ground, then the first entry) → loop of 40 bars (≈70 s): canon build (16, voices stacking on
 * harp, bell and strings, drums and stabs layering in) → breakdown (8, no drums, the lead sings the first two lines
 * over choir, snare build) → drop (16, euphoric saw lead on the sixteenth variation, then the first two lines in
 * thirds as the climax, the canon still running underneath).
 */
type Chord = [root: number, tones: number[]]
const D: Chord = [50, [62, 66, 69, 74]]
const A: Chord = [45, [61, 64, 69, 73]]
const Bm: Chord = [47, [62, 66, 71, 74]]
const Fsm: Chord = [42, [61, 66, 69, 73]]
const G: Chord = [43, [62, 67, 71, 74]]
const D2: Chord = [38, [62, 66, 69, 74]]
/** The ground: one chord per original quarter note (8 steps). */
const GROUND = [D, A, Bm, Fsm, G, D2, G, A]
const CYCLE = 64
const QUARTER = 8

/** Pachelbel's canon lines as [midi, original quarter notes]; each fills exactly one cycle. */
const LINE_1: [number, number][] = [78, 76, 74, 73, 71, 69, 71, 73].map((midi) => [midi, 1])
const LINE_2: [number, number][] = [74, 73, 71, 69, 67, 66, 67, 64].map((midi) => [midi, 1])
const LINE_3: [number, number][] = [62, 66, 69, 67, 66, 62, 66, 64, 62, 59, 62, 69, 67, 71, 69, 67].map((midi) => [
  midi,
  0.5,
])
const LINE_4: [number, number][] = [
  74, 73, 74, 62, 61, 69, 64, 66, 62, 74, 73, 71, 73, 78, 81, 83,
  79, 78, 76, 79, 78, 76, 74, 73, 71, 69, 67, 66, 64, 67, 66, 64,
].map((midi) => [midi, 0.25])

const lead: Note[] = []
const sparkle: Note[] = []
const double: Note[] = []
const harp: Note[] = []
const bell: Note[] = []
const voice: Note[] = []
const pluck: Note[] = []
const brass: Note[] = []
const stabs: Note[] = []
const strings: Note[] = []
const choir: Note[] = []
const bass: Note[] = []
const ground: Note[] = []
const drums: Note[] = []

function line(target: Note[], cycle: number, notes: [number, number][], strength = 1, transpose = 0, legato = 0.9) {
  let step = cycle * CYCLE
  for (const [midi, quarters] of notes) {
    const accent = (step - cycle * CYCLE) % QUARTER === 0 ? 1 : 0.86
    target.push([step, midi + transpose, quarters * QUARTER * legato, 0.8 * accent * strength])
    step += quarters * QUARTER
  }
}

/** Calls `each` for the eight ground chords of a cycle. */
function cycleChords(cycle: number, each: (step: number, chord: Chord, index: number) => void) {
  GROUND.forEach((chord, i) => each(cycle * CYCLE + i * QUARTER, chord, i))
}

const GATE = [0, 1, 2, 1, 3, 2, 1, 2]
function gated(cycle: number, strength: number) {
  cycleChords(cycle, (step, [, tones]) => {
    for (let s = 0; s < QUARTER; s++) {
      pluck.push([step + s, tones[GATE[s]] + 12, 0.7, (s % 4 === 2 ? 0.78 : s % 2 ? 0.55 : 0.66) * strength])
    }
  })
}

function offbeatBass(cycle: number, strength: number) {
  cycleChords(cycle, (step, [root]) => {
    // Fold the ground into A1–G2 so the saw bass sits under the kick, the octave answering on the second offbeat.
    const low = root >= 45 ? root - 12 : root
    for (const s of [2, 6]) bass.push([step + s, low + (s === 6 ? 12 : 0), 1.7, (s === 6 ? 0.72 : 0.86) * strength])
  })
}

function sustain(target: Note[], cycle: number, velocity: number, transpose = 0) {
  cycleChords(cycle, (step, [, tones]) => {
    target.push(...tones.slice(0, 3).map((pitch): Note => [step, pitch + transpose, QUARTER - 0.3, velocity]))
  })
}

function groundBass(cycle: number, velocity: number) {
  cycleChords(cycle, (step, [root]) => ground.push([step, root, QUARTER - 0.4, velocity]))
}

function stab(cycle: number, steps: number[], strength: number) {
  for (let bar = 0; bar < 4; bar++) {
    for (const s of steps) {
      const step = cycle * CYCLE + bar * 16 + s
      const [, tones] = GROUND[Math.floor((bar * 16 + s) / QUARTER)]
      for (const pitch of tones) {
        brass.push([step, pitch, 1.5, 0.72 * strength * (s ? 0.84 : 1)])
        stabs.push([step, pitch, 1.5, 0.78 * strength * (s ? 0.84 : 1)])
      }
    }
  }
}

/** 0: kick · 1: + clap and open offbeat hats · 2: + 16th hats. Four bars per call. */
function beat(cycle: number, level: number, strength = 1) {
  for (let bar = 0; bar < 4; bar++) {
    const at = cycle * CYCLE + bar * 16
    for (let s = 0; s < 16; s += 4) drums.push([at + s, DRUM.kick, 1, 0.96 * strength])
    if (level >= 1) {
      for (const s of [4, 12]) {
        drums.push([at + s, DRUM.clap, 1, 0.78 * strength], [at + s, DRUM.snare, 1, 0.4 * strength])
      }
      for (const s of [2, 6, 10, 14]) drums.push([at + s, DRUM.hatOpen, 1.2, 0.34 * strength])
    }
    if (level >= 2) for (let s = 1; s < 16; s += 2) drums.push([at + s, DRUM.hatClosed, 0.4, 0.2 * strength])
  }
  drums.push([cycle * CYCLE, DRUM.crash, 6, 0.7 * strength])
}

function lift(cycle: number) {
  const at = cycle * CYCLE + 3 * 16
  for (let s = 8; s < 16; s++) drums.push([at + s, DRUM.snare, 0.5, 0.4 + (s - 8) * 0.06])
}

// Intro: the ground alone on strings with a pad, the gated pluck fading in; then kick, bass and the first entry.
groundBass(0, 0.6)
groundBass(1, 0.62)
sustain(strings, 0, 0.4, 12)
sustain(strings, 1, 0.44, 12)
gated(0, 0.45)
gated(1, 0.62)
for (let s = 0; s < CYCLE; s += 8) drums.push([CYCLE / 2 + s, DRUM.kick, 1, 0.7])
beat(1, 0, 0.88)
offbeatBass(1, 0.85)
line(harp, 1, LINE_1, 0.9)
lift(1)

const LOOP = 2
let cycle = LOOP

// Canon build: each cycle a new voice enters with the first line while the others move on.
const BUILD: [harp: [number, number][], bell?: [number, number][], voice?: [number, number][]][] = [
  [LINE_2, LINE_1],
  [LINE_3, LINE_2, LINE_1],
  [LINE_4, LINE_3, LINE_2],
  [LINE_1, LINE_4, LINE_3],
]
BUILD.forEach(([first, second, third], i) => {
  line(i === 3 ? lead : harp, cycle, first, i === 3 ? 0.9 : 1)
  if (second) line(i === 3 ? harp : bell, cycle, second, 0.85)
  if (third) line(i === 3 ? bell : voice, cycle, third, 0.75, 0, 1)
  beat(cycle, i < 2 ? 1 : 2)
  offbeatBass(cycle, 1)
  gated(cycle, 0.8)
  groundBass(cycle, 0.5)
  sustain(strings, cycle, 0.38, 12)
  if (i >= 2) stab(cycle, [0, 10], 0.85)
  if (i === 3) lift(cycle)
  cycle++
})

// Breakdown: drums out; the lead sings the first two lines over strings and choir; a snare build in the second cycle.
for (const [i, notes] of [LINE_1, LINE_2].entries()) {
  line(lead, cycle, notes, 0.8, 0, 0.96)
  line(sparkle, cycle, notes, 0.5, 12, 0.96)
  groundBass(cycle, 0.66)
  sustain(strings, cycle, 0.5, 12)
  sustain(choir, cycle, 0.46)
  gated(cycle, 0.4 + i * 0.3)
  if (i === 0) drums.push([cycle * CYCLE, DRUM.crash, 8, 0.6])
  else {
    for (let bar = 0; bar < 4; bar++) {
      const spacing = bar < 2 ? 4 : bar < 3 ? 2 : 1
      for (let s = 0; s < 16; s += spacing) {
        drums.push([cycle * CYCLE + bar * 16 + s, DRUM.snare2, 0.45, Math.min(0.95, 0.3 + (bar * 16 + s) / 100)])
      }
      if (bar >= 2) for (let s = 0; s < 16; s += 4) drums.push([cycle * CYCLE + bar * 16 + s, DRUM.kick, 1, 0.86])
    }
    offbeatBass(cycle, 0.7)
  }
  cycle++
}

// Drop: the euphoric lead takes the sixteenth line twice, then the eighths an octave up, then lines one and two in
// thirds; the harp keeps the canon going underneath.
const DROP: [lead: [number, number][], harp: [number, number][], transpose: number][] = [
  [LINE_4, LINE_1, 0],
  [LINE_4, LINE_2, 0],
  [LINE_3, LINE_4, 12],
  [LINE_1, LINE_3, 0],
]
DROP.forEach(([melody, canon, transpose], i) => {
  line(lead, cycle, melody, 1, transpose)
  line(double, cycle, melody, 0.62, transpose - 12)
  if (i === 1 || i === 3) line(sparkle, cycle, melody, 0.5, 12)
  if (i === 3) line(brass, cycle, LINE_2, 0.7)
  line(harp, cycle, canon, 0.72)
  beat(cycle, 2)
  offbeatBass(cycle, 1)
  gated(cycle, 0.72)
  groundBass(cycle, 0.5)
  sustain(strings, cycle, 0.42, 12)
  sustain(choir, cycle, 0.44)
  stab(cycle, [0, 3, 6, 10, 12], 1)
  if (i === 3) lift(cycle)
  cycle++
})

export default {
  title: 'Canon in D (Remy Trance Mix)',
  bpm: 138,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: cycle * CYCLE,
  loopStart: LOOP * CYCLE,
  room: 0.65,
  echoBeats: 0.75,
  echoFeedback: 0.32,
  parts: [
    { inst: 'saw_lead', notes: lead, vol: 0.56, pan: 0, reverb: 0.24, echo: 0.24 },
    { inst: 'square', notes: sparkle, vol: 0.2, pan: 0.22, reverb: 0.3, echo: 0.26 },
    { inst: 'brass', notes: double, vol: 0.28, pan: -0.2, reverb: 0.22 },
    { inst: 'harp', notes: harp, vol: 0.5, pan: 0.3, reverb: 0.3, echo: 0.22 },
    { inst: 'bell', notes: bell, vol: 0.34, pan: -0.3, reverb: 0.4, echo: 0.2 },
    { inst: 'strings', notes: voice, vol: 0.32, pan: -0.15, reverb: 0.4 },
    { inst: 'square50', notes: pluck, vol: 0.24, pan: 0.3, reverb: 0.14, echo: 0.3 },
    { inst: 'brass', notes: brass, vol: 0.2, pan: -0.25, reverb: 0.22 },
    { inst: 'strings_stacc', notes: stabs, vol: 0.22, pan: 0.25, reverb: 0.22 },
    { inst: 'strings', notes: strings, vol: 0.2, pan: -0.35, reverb: 0.45 },
    { inst: 'choir', notes: choir, vol: 0.24, pan: 0.35, reverb: 0.5 },
    { inst: 'bass_saw', notes: bass, vol: 0.5, pan: 0, reverb: 0.03 },
    { inst: 'strings', notes: ground, vol: 0.3, pan: 0, reverb: 0.3 },
    { inst: 'drums', notes: drums, vol: 0.68, pan: 0, reverb: 0.07 },
  ],
} satisfies Song
