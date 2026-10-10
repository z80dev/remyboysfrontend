import { DRUM, type Note, type Song } from '../../quest/music/song'

/**
 * "Flight of the Bumblebee (Remy Jungle Mix)" — Rimsky-Korsakov, The Tale of Tsar Saltan (1900), A minor, 172 BPM
 * drum & bass. Rimsky's 2/4 bar of sixteenths is half a bar here, so the bee flies at its own speed.
 * The opening dive (E D♯ D C♯ D C♯ C B | C B A♯ A G♯ G F♯ F from E6, then again an octave lower) and the buzzing figure
 * A G♯ G F♯ F A♯ A G♯ | A G♯ G F♯ F F♯ G G♯, which also buzzes around E and an octave up; chromatic climbs link them.
 * Saw lead, a reese of saw bass over a sub, amen-style breaks built from the drum map.
 * Intro (4 bars: the dive, then the buzz over a hat build) → loop of 40 bars (≈56 s): theme (8) → theme with
 * doubles and busier breaks (8) → half-time violin breakdown, the buzz in eighths (8) → snare-roll build (4) → drop
 * (12: theme, buzz, and the dive again, which leads straight back into the buzz at the loop start).
 */
type Chord = [root: number, tones: number[]]
const Am: Chord = [33, [57, 60, 64]]
const F: Chord = [29, [57, 60, 65]]
const E: Chord = [28, [56, 59, 64]]

/** The bee's buzz: two 2/4 bars of sixteenths around `root`. */
const buzz = (root: number) => [0, -1, -2, -3, -4, 1, 0, -1, 0, -1, -2, -3, -4, -3, -2, -1].map((o) => root + o)
const CLIMB = [69, 70, 71, 72, 73, 72, 71, 70, 69, 70, 71, 72, 73, 74, 75, 76]
const DIVE_HIGH = [88, 87, 86, 85, 86, 85, 84, 83, 84, 83, 82, 81, 80, 79, 78, 77]
const DIVE_LOW = DIVE_HIGH.map((midi) => midi - 12)

/** One 4/4 bar: sixteen lead pitches and a chord per half bar. */
type Bar = { notes: number[]; chords: [Chord, Chord] }
const THEME: Bar[] = [
  { notes: buzz(69), chords: [Am, Am] },
  { notes: buzz(69), chords: [Am, Am] },
  { notes: CLIMB, chords: [F, E] },
  { notes: buzz(76), chords: [E, E] },
  { notes: buzz(76), chords: [E, E] },
  { notes: buzz(81), chords: [Am, Am] },
  { notes: DIVE_HIGH, chords: [E, E] },
  { notes: DIVE_LOW, chords: [E, E] },
]

const lead: Note[] = []
const low: Note[] = []
const violin: Note[] = []
const bell: Note[] = []
const stabs: Note[] = []
const pad: Note[] = []
const reese: Note[] = []
const sub: Note[] = []
const drums: Note[] = []

/** Lays a bar's sixteenths; `stretch` 2 plays them as eighths over two bars. */
function run(target: Note[], step: number, notes: number[], strength = 1, transpose = 0, stretch = 1) {
  notes.forEach((midi, i) => {
    const accent = i % 4 === 0 ? 0.92 : 0.74
    target.push([step + i * stretch, midi + transpose, 0.86 * stretch, accent * strength])
  })
}

/** Reese over a sub: a long note, a syncopated re-hit on the "and" of 3, the octave on the last 16th. */
function bassline(step: number, [first, second]: [Chord, Chord], busy: boolean) {
  const shape: [number, Chord, number, number][] = busy
    ? [[0, first, 0, 6], [6, first, 12, 1.5], [10, second, 0, 4], [15, second, 12, 1]]
    : [[0, first, 0, 9.5], [10, second, 0, 5.6]]
  for (const [s, [root], octave, length] of shape) {
    reese.push([step + s, root + 12 + octave, length, s ? 0.8 : 0.9])
    sub.push([step + s, root + octave, length, s ? 0.78 : 0.88])
  }
}

/** Amen-style: kick on 1 and its pickup, snare on 2 and 4 with ghosts, ride eighths; the variant moves the ghosts. */
function amen(bar: number, variant: number, strength = 1) {
  const at = bar * 16
  for (const s of variant % 2 ? [0, 2, 10] : [0, 2, 10, 11]) {
    drums.push([at + s, DRUM.kick, 1, (s ? 0.82 : 0.96) * strength])
  }
  for (const s of variant === 3 ? [4, 14] : [4, 12]) drums.push([at + s, DRUM.snare, 1, 0.9 * strength])
  for (const s of variant === 3 ? [7, 9, 12] : variant === 1 ? [7, 9, 14, 15] : [7, 9, 15]) {
    drums.push([at + s, DRUM.snare2, 0.5, 0.36 * strength])
  }
  for (let s = 0; s < 16; s += 2) drums.push([at + s, DRUM.ride, 0.8, (s % 4 ? 0.26 : 0.34) * strength])
  for (let s = 1; s < 16; s += 2) drums.push([at + s, DRUM.hatClosed, 0.4, 0.16 * strength])
  if (variant === 3) drums.push([at + 10, DRUM.crash, 4, 0.5 * strength])
}

function halftime(bar: number) {
  const at = bar * 16
  drums.push([at, DRUM.kick, 1, 0.9], [at + 11, DRUM.kick, 1, 0.66], [at + 8, DRUM.snare, 1, 0.86])
  for (let s = 0; s < 16; s += 2) drums.push([at + s, DRUM.hatClosed, 0.5, s % 4 ? 0.16 : 0.26])
  drums.push([at + 14, DRUM.hatOpen, 1.2, 0.2])
}

function chordPad(step: number, [first, second]: [Chord, Chord], velocity: number) {
  for (const [half, [, tones]] of [first, second].entries()) {
    pad.push(...tones.map((pitch): Note => [step + half * 8, pitch, 7.7, velocity]))
  }
}

// Intro: the dive over a dominant pad and a timpani roll, then the buzz over building hats and a snare roll.
run(lead, 0, DIVE_HIGH, 0.9)
run(lead, 16, DIVE_LOW, 0.9)
chordPad(0, [E, E], 0.4)
chordPad(16, [E, E], 0.44)
sub.push([0, 28, 31, 0.6])
drums.push([0, DRUM.crash, 8, 0.6], [16, DRUM.timpaniRoll, 16, 0.5])
for (const bar of [2, 3]) {
  run(lead, bar * 16, buzz(69), 0.95)
  chordPad(bar * 16, [Am, Am], 0.4)
  bassline(bar * 16, [Am, Am], false)
  drums.push([bar * 16, DRUM.kick, 1, 0.9])
  for (let s = 0; s < 16; s++) drums.push([bar * 16 + s, DRUM.hatClosed, 0.4, 0.12 + (bar - 2) * 0.08 + s * 0.006])
}
for (let s = 8; s < 16; s++) drums.push([48 + s, DRUM.snare, 0.5, 0.4 + (s - 8) * 0.07])

const LOOP = 4
let bar = LOOP

// Theme, then again with an octave-down pulse double, busier bass and breaks, and stabs on the downbeats.
for (const pass of [0, 1]) {
  THEME.forEach(({ notes, chords }, i) => {
    const at = bar * 16
    run(lead, at, notes)
    if (pass) {
      run(low, at, notes, 0.7, -12)
      for (const s of [0, 10]) stabs.push(...chords[s < 8 ? 0 : 1][1].map((pitch): Note => [at + s, pitch, 1.4, 0.72]))
    }
    bassline(at, chords, pass === 1 && i % 2 === 1)
    chordPad(at, chords, 0.3)
    amen(bar, pass ? i % 4 : i % 2 ? 2 : 0)
    if (i === 0) drums.push([at, DRUM.crash, 6, 0.7])
    bar++
  })
}

// Breakdown: half-time; a violin plays the buzz in eighths (each figure over two bars), the reese held long.
const BREAK: { notes: number[]; chord: Chord }[] = [
  { notes: buzz(69), chord: Am },
  { notes: buzz(76), chord: E },
  { notes: buzz(69), chord: Am },
  { notes: CLIMB, chord: E },
]
BREAK.forEach(({ notes, chord }, i) => {
  const at = bar * 16
  run(violin, at, notes, 0.85, 0, 2)
  run(bell, at, notes.filter((_, k) => k % 4 === 0), 0.6, 12, 8)
  for (const half of [0, 1]) {
    chordPad(at + half * 16, [chord, chord], 0.46)
    halftime(bar + half)
  }
  reese.push([at, chord[0] + 12, 31, 0.62])
  sub.push([at, chord[0], 31, 0.7])
  if (i === 0) drums.push([at, DRUM.crash, 8, 0.6])
  bar += 2
})

// Build: the buzz and the climb over a snare roll tightening from eighths to 32nds; the bass drops out at the end.
THEME.slice(0, 4).forEach(({ notes, chords }, i) => {
  const at = bar * 16
  run(lead, at, notes, 0.8 + i * 0.05)
  chordPad(at, chords, 0.36 + i * 0.04)
  if (i < 3) bassline(at, chords, false)
  const spacing = i < 2 ? 2 : i < 3 ? 1 : 0.5
  for (let s = 0; s < 16; s += spacing) {
    drums.push([at + s, DRUM.snare, 0.45, Math.min(0.95, 0.32 + (i * 16 + s) / 100)])
  }
  drums.push([at, DRUM.kick, 1, 0.9])
  bar++
})

// Drop: the whole theme with every layer, then the buzz twice and the dive, which hands back to the loop's buzz.
const DROP: Bar[] = [
  ...THEME,
  { notes: buzz(69), chords: [Am, Am] },
  { notes: buzz(69), chords: [Am, Am] },
  { notes: DIVE_HIGH, chords: [E, E] },
  { notes: DIVE_LOW, chords: [E, E] },
]
DROP.forEach(({ notes, chords }, i) => {
  const at = bar * 16
  run(lead, at, notes)
  run(violin, at, notes, 0.6)
  run(low, at, notes, 0.7, -12)
  bassline(at, chords, i % 2 === 1)
  chordPad(at, chords, 0.32)
  for (const s of [0, 6, 10]) stabs.push(...chords[s < 8 ? 0 : 1][1].map((pitch): Note => [at + s, pitch, 1.2, 0.76]))
  amen(bar, i % 4)
  if (i % 4 === 0) drums.push([at, DRUM.crash, 6, 0.74])
  bar++
})

export default {
  title: 'Flight of the Bumblebee (Remy Jungle Mix)',
  bpm: 172,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: bar * 16,
  loopStart: LOOP * 16,
  room: 0.4,
  echoBeats: 0.75,
  echoFeedback: 0.25,
  parts: [
    { inst: 'saw_lead', notes: lead, vol: 0.5, pan: 0.05, reverb: 0.12, echo: 0.1 },
    { inst: 'square', notes: low, vol: 0.3, pan: -0.3, reverb: 0.1 },
    { inst: 'violin', notes: violin, vol: 0.5, pan: 0.25, reverb: 0.3 },
    { inst: 'bell', notes: bell, vol: 0.3, pan: -0.2, reverb: 0.4, echo: 0.3 },
    { inst: 'strings_stacc', notes: stabs, vol: 0.3, pan: -0.15, reverb: 0.2 },
    { inst: 'pad', notes: pad, vol: 0.22, pan: 0.2, reverb: 0.4 },
    { inst: 'bass_saw', notes: reese, vol: 0.4, pan: 0, reverb: 0.03 },
    { inst: 'bass', notes: sub, vol: 0.5, pan: 0, reverb: 0 },
    { inst: 'drums', notes: drums, vol: 0.72, pan: 0, reverb: 0.06 },
  ],
} satisfies Song
