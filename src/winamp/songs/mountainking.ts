import { DRUM, type Note, type Song } from '../../quest/music/song'

/**
 * "Hall of the Mountain King (Remy Rave Mix)" — Grieg, Peer Gynt (1875), B minor, 140 BPM hard trance / eurodance.
 * Grieg's theme over his B pedal: B C♯ D E F♯ D F♯ | E♯ C♯ E♯ E C E | B C♯ D E F♯ D F♯ B | A F♯ D F♯ A, answered by
 * the same phrase on the dominant (F♯ G♯ A♯ B C♯ A♯ C♯ | D A♯ D C♯ A♯ C♯ | … F♯ | E C♯ A♯ C♯ E) over an F♯ pedal.
 * One tempo, so Grieg's accelerando is faked: the theme's eighth note spans 4 steps (march), then 2 (gallop), then
 * 1 (frenzy) — every pass twice as fast — while the beat thickens from four-on-the-floor to 16th hats and snares.
 * Intro (8 bars, pizzicato theme as in the cellos and bassoons) → loop of 56 bars (≈96 s): march (16) → gallop (16)
 * → breakdown (8, piano theme over choir, snare build) → frenzy drop (14) → Grieg's hammered final chords (2).
 */
type Chord = [bass: number, tones: number[]]
const Bm: Chord = [35, [59, 62, 66, 71]]
const Cs: Chord = [37, [61, 65, 68, 73]]
const C: Chord = [36, [60, 64, 67, 72]]
const Bm7: Chord = [35, [57, 62, 66, 71]]
const Fs: Chord = [42, [58, 61, 66, 70]]
const Daug: Chord = [38, [58, 62, 66, 70]]
const Fs7: Chord = [42, [58, 61, 64, 70]]

/** Grieg's four-bar phrases as [semitones above B, eighth notes]; one chord per half bar. */
type Phrase = { notes: [offset: number, eighths: number][]; chords: Chord[] }
const TONIC: Phrase = {
  notes: [
    [0, 1], [2, 1], [3, 1], [5, 1], [7, 1], [3, 1], [7, 2],
    [6, 1], [2, 1], [6, 2], [5, 1], [1, 1], [5, 2],
    [0, 1], [2, 1], [3, 1], [5, 1], [7, 1], [3, 1], [7, 1], [12, 1],
    [10, 1], [7, 1], [3, 1], [7, 1], [10, 4],
  ],
  chords: [Bm, Bm, Cs, C, Bm, Bm, Bm7, Bm7],
}
const DOMINANT: Phrase = {
  notes: [
    [7, 1], [9, 1], [11, 1], [12, 1], [14, 1], [11, 1], [14, 2],
    [15, 1], [11, 1], [15, 2], [14, 1], [11, 1], [14, 2],
    [7, 1], [9, 1], [11, 1], [12, 1], [14, 1], [11, 1], [14, 1], [19, 1],
    [17, 1], [14, 1], [11, 1], [14, 1], [17, 4],
  ],
  chords: [Fs, Fs, Daug, Fs, Fs, Fs, Fs7, Fs7],
}

const lead: Note[] = []
const sparkle: Note[] = []
const double: Note[] = []
const pizz: Note[] = []
const piano: Note[] = []
const brass: Note[] = []
const stabs: Note[] = []
const strings: Note[] = []
const choir: Note[] = []
const bass: Note[] = []
const drone: Note[] = []
const timpani: Note[] = []
const hits: Note[] = []
const drums: Note[] = []

/** The chord sounding at every step, filled in as the phrases are laid out. */
const harmony: Chord[] = []

/** Lays a phrase at `at` with an eighth note of `k` steps; returns the step after it. */
function play(target: Note[], at: number, phrase: Phrase, k: number, base: number, strength: number, legato = 0.7) {
  let step = at
  for (const [offset, eighths] of phrase.notes) {
    const accent = (step - at) % (8 * k) === 0 ? 0.94 : (step - at) % (2 * k) === 0 ? 0.84 : 0.76
    target.push([step, base + offset, Math.max(0.6, eighths * k * legato), accent * strength])
    step += eighths * k
  }
  return step
}

function harmonize(at: number, phrase: Phrase, k: number) {
  phrase.chords.forEach((chord, i) => {
    for (let s = 0; s < 4 * k; s++) harmony[at + i * 4 * k + s] = chord
  })
}

function stab(step: number, [, tones]: Chord, strength: number, length = 1.5) {
  for (const pitch of tones) {
    brass.push([step, pitch, length, 0.72 * strength])
    stabs.push([step, pitch, length, 0.78 * strength])
  }
}

/** Offbeat saw bass; the frenzy adds the octave on the following 16th. */
function offbeatBass(bar: number, strength: number, gallop = false) {
  for (let s = 2; s < 16; s += 4) {
    const [root] = harmony[bar * 16 + s]
    bass.push([bar * 16 + s, root, gallop ? 0.9 : 1.7, 0.86 * strength])
    if (gallop) bass.push([bar * 16 + s + 1, root + 12, 0.8, 0.66 * strength])
  }
}

/** Sustains the harmony in `chunk`-step slices (it changes every half bar at most). */
function pad(target: Note[], bar: number, velocity: number, chunk: number, transpose = 0) {
  for (let s = 0; s < 16; s += chunk) {
    const [, tones] = harmony[bar * 16 + s]
    target.push(...tones.map((pitch): Note => [bar * 16 + s, pitch + transpose, chunk - 0.3, velocity]))
  }
}

/** 0: kick · 1: + clap and open offbeat hats · 2: + 16th hats · 3: + snare drive on the 8ths. */
function beat(bar: number, level: number, strength = 1) {
  const at = bar * 16
  for (let s = 0; s < 16; s += 4) drums.push([at + s, DRUM.kick, 1, 0.97 * strength])
  if (level >= 1) {
    for (const s of [4, 12]) {
      drums.push([at + s, DRUM.clap, 1, 0.8 * strength], [at + s, DRUM.snare, 1, 0.42 * strength])
    }
    for (const s of [2, 6, 10, 14]) drums.push([at + s, DRUM.hatOpen, 1.2, 0.34 * strength])
  }
  if (level >= 2) for (let s = 1; s < 16; s += 2) drums.push([at + s, DRUM.hatClosed, 0.4, 0.24 * strength])
  if (level >= 3) {
    for (const s of [2, 6, 10, 14]) drums.push([at + s, DRUM.snare2, 0.5, 0.26 * strength])
    for (let s = 0; s < 16; s += 2) drums.push([at + s, DRUM.tambourine, 0.5, 0.18 * strength])
  }
}

function roll(bar: number, from: number, spacing: number, start: number, end: number, sound: number = DRUM.snare) {
  const count = (16 - from) / spacing
  for (let i = 0; i < count; i++) {
    drums.push([bar * 16 + from + i * spacing, sound, 0.45, start + ((end - start) * i) / Math.max(1, count - 1)])
  }
}

// Intro: the theme slow and pizzicato in octaves; kick from bar 2, the offbeat bass and strings from bar 4.
play(pizz, 0, TONIC, 4, 47, 0.95, 0.4)
play(pizz, 0, TONIC, 4, 59, 0.7, 0.4)
harmonize(0, TONIC, 4)
for (let bar = 0; bar < 8; bar++) {
  if (bar >= 2) beat(bar, bar >= 4 ? 1 : 0, bar >= 4 ? 0.9 : 0.75)
  if (bar >= 4) {
    offbeatBass(bar, 0.85)
    pad(strings, bar, 0.42 + (bar - 4) * 0.04, 16, 12)
  } else {
    drone.push([bar * 16, 47, 15.6, 0.5])
  }
}
drums.push([0, DRUM.timpaniRoll, 14, 0.4])
roll(7, 8, 1, 0.4, 0.8)

const LOOP = 8
let bar = LOOP

// March: eighth = 4 steps, a saw lead with a pulse an octave up; stabs on every chord change.
for (const phrase of [TONIC, DOMINANT]) {
  const at = bar * 16
  harmonize(at, phrase, 4)
  play(lead, at, phrase, 4, 59, 1, 0.66)
  play(sparkle, at, phrase, 4, 71, 0.6, 0.5)
  for (let i = 0; i < 8; i++) {
    beat(bar + i, 1)
    offbeatBass(bar + i, 1)
    pad(strings, bar + i, 0.4, 16, 12)
    stab(at + i * 16, phrase.chords[i], 0.9)
    stab(at + i * 16 + 10, phrase.chords[i], 0.7)
    if (i === 7) roll(bar + i, 12, 1, 0.45, 0.75)
  }
  drums.push([at, DRUM.crash, 6, 0.72])
  bar += 8
}

// Gallop: eighth = 2 steps, an octave higher with a brass double, 16th hats, offbeat stabs.
for (const [n, phrase] of [TONIC, DOMINANT, TONIC, DOMINANT].entries()) {
  const at = bar * 16
  harmonize(at, phrase, 2)
  play(lead, at, phrase, 2, 71, 1, 0.72)
  play(double, at, phrase, 2, 59, 0.66, 0.72)
  for (let i = 0; i < 4; i++) {
    beat(bar + i, 2)
    offbeatBass(bar + i, 1)
    pad(strings, bar + i, 0.36, 8, 12)
    if (n >= 2) pad(choir, bar + i, 0.4, 8)
    for (const s of [0, 3, 6, 10, 12]) stab(at + i * 16 + s, harmony[at + i * 16 + s], s ? 0.82 : 1)
  }
  if (n % 2 === 0) drums.push([at, DRUM.crash, 6, 0.74])
  if (n === 3) roll(bar + 3, 8, 1, 0.4, 0.85)
  bar += 4
}

// Breakdown: drums out, the theme back at march speed on piano over strings and choir; a snare build from bar 4.
{
  const at = bar * 16
  harmonize(at, TONIC, 4)
  play(piano, at, TONIC, 4, 59, 0.82, 0.9)
  play(sparkle, at, TONIC, 4, 71, 0.4, 0.5)
  drums.push([at, DRUM.crash, 8, 0.6])
  for (let i = 0; i < 8; i++) {
    pad(strings, bar + i, 0.5, 16, 12)
    pad(choir, bar + i, 0.44, 16)
    drone.push([at + i * 16, harmony[at + i * 16][0] + 12, 15.6, 0.62])
    if (i >= 4) {
      const spacing = i < 6 ? 2 : i < 7 ? 1 : 0.5
      roll(bar + i, 0, spacing, 0.3 + (i - 4) * 0.14, 0.45 + (i - 4) * 0.15, DRUM.snare2)
      offbeatBass(bar + i, 0.5 + (i - 4) * 0.1)
    }
    if (i >= 6) for (let s = 0; s < 16; s += 4) drums.push([at + i * 16 + s, DRUM.kick, 1, 0.85])
  }
  bar += 8
}

// Frenzy: eighth = 1 step, Grieg's prestissimo — 16th-note theme, galloping bass, full kit, a stab on every change.
for (const [n, phrase] of [TONIC, DOMINANT, TONIC, DOMINANT, TONIC, DOMINANT, TONIC].entries()) {
  const at = bar * 16
  harmonize(at, phrase, 1)
  play(lead, at, phrase, 1, 71, 1, 0.82)
  play(double, at, phrase, 1, 59, 0.7, 0.82)
  for (let i = 0; i < 2; i++) {
    beat(bar + i, 3)
    offbeatBass(bar + i, 1, true)
    pad(strings, bar + i, 0.34, 4, 12)
    pad(choir, bar + i, 0.36, 4)
    for (let s = 0; s < 16; s += 4) stab(at + i * 16 + s, harmony[at + i * 16 + s], s ? 0.8 : 1, 1.2)
  }
  if (n % 2 === 0) drums.push([at, DRUM.crash, 6, 0.76])
  bar += 2
}

// Grieg's ending: hammered tutti B minor chords with timpani, then a roll back to the march.
{
  const at = bar * 16
  for (let s = 0; s < 32; s++) harmony[at + s] = s >= 12 && s < 16 ? Fs : Bm
  for (const s of [0, 4, 8, 12, 16]) {
    const chord = harmony[at + s]
    stab(at + s, chord, 1, s === 16 ? 8 : 2.5)
    hits.push([at + s, chord[1][3], 2, 0.9])
    timpani.push([at + s, chord[0] + 12, 3, 0.9])
    bass.push([at + s, chord[0], s === 16 ? 8 : 2.5, 0.9])
    lead.push([at + s, chord[1][3] + 12, s === 16 ? 8 : 2.5, 0.9])
    drums.push([at + s, DRUM.kick, 1, 0.98])
  }
  drums.push([at, DRUM.crash, 8, 0.8], [at + 16, DRUM.crash, 12, 0.85], [at + 20, DRUM.timpaniRoll, 12, 0.6])
  choir.push(...Bm[1].map((pitch): Note => [at, pitch, 31, 0.46]))
  strings.push(...Bm[1].map((pitch): Note => [at, pitch + 12, 31, 0.44]))
  roll(bar + 1, 8, 0.5, 0.35, 0.9)
  bar += 2
}

export default {
  title: 'Hall of the Mountain King (Remy Rave Mix)',
  bpm: 140,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: bar * 16,
  loopStart: LOOP * 16,
  room: 0.6,
  echoBeats: 0.75,
  echoFeedback: 0.28,
  parts: [
    { inst: 'saw_lead', notes: lead, vol: 0.58, pan: 0, reverb: 0.18, echo: 0.16 },
    { inst: 'square', notes: sparkle, vol: 0.22, pan: 0.22, reverb: 0.22, echo: 0.22 },
    { inst: 'brass', notes: double, vol: 0.3, pan: -0.2, reverb: 0.2 },
    { inst: 'strings_stacc', notes: pizz, vol: 0.62, pan: -0.1, reverb: 0.3 },
    { inst: 'piano', notes: piano, vol: 0.62, pan: 0.1, reverb: 0.35, echo: 0.2 },
    { inst: 'brass', notes: brass, vol: 0.2, pan: -0.25, reverb: 0.22 },
    { inst: 'strings_stacc', notes: stabs, vol: 0.22, pan: 0.25, reverb: 0.22 },
    { inst: 'strings', notes: strings, vol: 0.2, pan: -0.35, reverb: 0.4 },
    { inst: 'choir', notes: choir, vol: 0.24, pan: 0.35, reverb: 0.45 },
    { inst: 'bass_saw', notes: bass, vol: 0.55, pan: 0, reverb: 0.03 },
    { inst: 'pad', notes: drone, vol: 0.32, pan: 0, reverb: 0.15 },
    { inst: 'timpani', notes: timpani, vol: 0.5, pan: 0, reverb: 0.3 },
    { inst: 'orch_hit', notes: hits, vol: 0.32, pan: 0, reverb: 0.35 },
    { inst: 'drums', notes: drums, vol: 0.68, pan: 0, reverb: 0.07 },
  ],
} satisfies Song
