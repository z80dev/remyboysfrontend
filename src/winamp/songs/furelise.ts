import { DRUM, type Note, type Song } from '../../quest/music/song'

/**
 * "Für Elise (Remy Lo-Fi Mix)" — Beethoven, Bagatelle WoO 59, A minor, as dusty 12/8 trip-hop.
 * Beethoven's 3/8 bar becomes one dotted-quarter beat (6 sixteenth steps), so his sixteenths and rhythms stay exact
 * while the boom-bap shuffles underneath: kick on 1, snare on 2 and 4, triplet hats, a little 16th swing.
 * The A-section melody is untouched on piano (E D♯ E B D C | A … C E A | B … E G♯ B | C … E E D♯, …); the Rhodes
 * re-harmonizes it per bar: E7♭13 | Am9 | E9 | Fmaj9 | E7♯9 | Dm9 | E7♭9 | Am9, and Cmaj9 G13 Am9 E7♭9 under the
 * second strain (E… G F E | D… F E D | C… E D C | B), whose return to the theme is abridged to the E D♯ pickup.
 * Intro (1 bar: Rhodes and crackle, then the pickup) → loop of 14 bars (≈51 s): A (first ending) → A (second ending)
 * → second strain → A on flute → interlude (Rhodes, motif echoes, thin kit) → A → A (second ending) → second strain.
 * Vinyl dust is a separate, barely audible kit of random rim/hat ticks.
 */
type Chord = [bass: number, voicing: number[]]
const E7b13: Chord = [40, [50, 56, 60]]
const Am9: Chord = [33, [55, 59, 60, 64]]
const E9: Chord = [40, [50, 54, 56, 59]]
const Fmaj9: Chord = [41, [52, 55, 57, 60]]
const E7s9: Chord = [40, [56, 62, 67]]
const Dm9: Chord = [38, [53, 57, 60, 64]]
const E7b9: Chord = [40, [50, 53, 56, 59]]
const Cmaj9: Chord = [36, [52, 55, 59, 62]]
const G13: Chord = [31, [53, 59, 64]]

// One Beethoven bar each, [sixteenth, midi, sixteenths].
const TURN: Note[] = [[0, 76, 1], [1, 75, 1], [2, 76, 1], [3, 71, 1], [4, 74, 1], [5, 72, 1]]
const A_UP: Note[] = [[0, 69, 2], [3, 60, 1], [4, 64, 1], [5, 69, 1]]
const B_UP: Note[] = [[0, 71, 2], [3, 64, 1], [4, 68, 1], [5, 71, 1]]
const C_UP: Note[] = [[0, 72, 2], [3, 64, 1], [4, 76, 1], [5, 75, 1]]
const B_DOWN: Note[] = [[0, 71, 2], [3, 64, 1], [4, 72, 1], [5, 71, 1]]
const PICKUP: Note[] = [[4, 76, 1], [5, 75, 1]]
const FIRST_ENDING: Note[] = [[0, 69, 2], ...PICKUP]
const SECOND_ENDING: Note[] = [[0, 69, 2], [3, 71, 1], [4, 72, 1], [5, 74, 1]]
const THEME = [TURN, A_UP, B_UP, C_UP, TURN, A_UP, B_DOWN]
const THEME_CHORDS = [E7b13, Am9, E9, Fmaj9, E7s9, Dm9, E7b9, Am9]
const STRAIN: Note[][] = [
  [[0, 76, 3], [3, 67, 1], [4, 77, 1], [5, 76, 1]],
  [[0, 74, 3], [3, 65, 1], [4, 76, 1], [5, 74, 1]],
  [[0, 72, 3], [3, 64, 1], [4, 74, 1], [5, 72, 1]],
  [[0, 71, 2], ...PICKUP],
]
const STRAIN_CHORDS = [Cmaj9, G13, Am9, E7b9]
const INTERLUDE_CHORDS = [Am9, Fmaj9, Dm9, E7s9, Am9, Fmaj9, Dm9, E7s9]

const piano: Note[] = []
const flute: Note[] = []
const sparkle: Note[] = []
const keys: Note[] = []
const bass: Note[] = []
const pad: Note[] = []
const drums: Note[] = []
const dust: Note[] = []

/** Steps per Beethoven bar; four of them make one 12/8 bar. */
const BAR = 6

function phrase(target: Note[], at: number, notes: Note[], strength = 1, transpose = 0) {
  for (const [step, pitch, length, velocity = 0.7] of notes) {
    const accent = step === 0 ? 1.08 : 1
    target.push([at * BAR + step, pitch + transpose, length * 0.94, Math.min(1, velocity * accent * strength)])
  }
}

/** Rhodes: a lazy roll on the downbeat, sometimes a pushed upper-voice repeat on the last sixteenth. */
function comp(at: number, [, voicing]: Chord, variant: number) {
  const step = at * BAR
  voicing.forEach((pitch, i) => keys.push([step + i * 0.06, pitch, variant % 3 === 2 ? 2.6 : 5.4, 0.5 + i * 0.02]))
  if (variant % 3 === 2) voicing.slice(1).forEach((pitch, i) => keys.push([step + 3 + i * 0.05, pitch, 2.6, 0.4]))
}

function walk(at: number, [root]: Chord, [next]: Chord, approach: boolean) {
  bass.push([at * BAR, root, approach ? 3.6 : 5.2, 0.8])
  if (approach && next !== root) bass.push([at * BAR + 5, next + (next > root ? -1 : 1), 0.9, 0.56])
}

/** One 12/8 bar of boom-bap: four Beethoven bars. */
function kit(bar: number, variant: number) {
  const at = bar * 4 * BAR
  for (const [s, v] of variant === 1 ? [[0, 0.86], [10, 0.6], [14, 0.5]] : [[0, 0.86], [10, 0.62], [12, 0.7]]) {
    drums.push([at + s, DRUM.kick, 1, v])
  }
  for (const s of [6, 18]) drums.push([at + s, DRUM.snare, 1, 0.6], [at + s, DRUM.rim, 1, 0.22])
  for (let s = 0; s < 24; s += 2) {
    const open = variant === 3 && s === 22
    drums.push([at + s, open ? DRUM.hatOpen : DRUM.hatClosed, open ? 1.6 : 0.6, open ? 0.2 : s % 6 ? 0.15 : 0.24])
  }
  if (variant === 2) drums.push([at + 23, DRUM.snare2, 0.5, 0.16], [at + 21, DRUM.snare2, 0.5, 0.12])
  for (let s = 1; s < 24; s += 2) drums.push([at + s, DRUM.shaker, 0.5, 0.09])
}

function thinKit(bar: number) {
  const at = bar * 4 * BAR
  drums.push([at, DRUM.kick, 1, 0.7], [at + 12, DRUM.kick, 1, 0.5])
  for (const s of [6, 18]) drums.push([at + s, DRUM.rim, 1, 0.4])
  for (let s = 0; s < 24; s++) drums.push([at + s, DRUM.shaker, 0.5, s % 2 ? 0.08 : 0.14])
}

/** Lays harmony for Beethoven bars `at …`: Rhodes, bass walking into the following chord. */
function harmonize(at: number, chords: Chord[], following: Chord, sparse = false) {
  chords.forEach((chord, i) => {
    comp(at + i, chord, i)
    walk(at + i, chord, chords[i + 1] ?? following, !sparse && i % 2 === 1)
  })
}

// Intro: Rhodes over crackle, Am9 Fmaj9 Dm9 E7♯9, the bass sneaking in; the piano's pickup leads into the theme.
harmonize(0, [Am9, Fmaj9, Dm9, E7s9], E7b13, true)
phrase(piano, 3, PICKUP)
for (let s = 0; s < 24; s += 2) drums.push([s, DRUM.shaker, 0.5, 0.1 + s * 0.003])

const LOOP = 1
let bar = LOOP
type Section = { melody: Note[][]; chords: Chord[]; flute?: boolean }
const A1: Section = { melody: [...THEME, FIRST_ENDING], chords: THEME_CHORDS }
const A2: Section = { melody: [...THEME, SECOND_ENDING], chords: THEME_CHORDS }
const B: Section = { melody: STRAIN, chords: STRAIN_CHORDS }

const sections: (Section | 'interlude')[] = [A1, A2, B, { ...A1, flute: true }, 'interlude', A1, A2, B]
sections.forEach((section, index) => {
  const next = sections[(index + 1) % sections.length]
  const following = next === 'interlude' ? Am9 : next.chords[0]
  const at = bar * 4
  if (section === 'interlude') {
    harmonize(at, INTERLUDE_CHORDS, following)
    phrase(sparkle, at, TURN, 0.8, 12)
    phrase(sparkle, at + 4, TURN, 0.7, 12)
    INTERLUDE_CHORDS.forEach((chord, i) => {
      pad.push(...chord[1].map((pitch): Note => [(at + i) * BAR, pitch, BAR - 0.2, 0.34]))
    })
    phrase(piano, at + 7, PICKUP)
    thinKit(bar)
    kit(bar + 1, 1)
    drums.push([at * BAR, DRUM.ride, 4, 0.26])
    bar += 2
    return
  }
  harmonize(at, section.chords, following)
  section.melody.forEach((notes, i) => {
    phrase(section.flute ? flute : piano, at + i, notes)
    if (section.flute) {
      phrase(piano, at + i, notes, 0.55)
      if (i % 2 === 1) {
        const [, top] = section.chords[i]
        for (const [s, k] of [[1, 0], [3, 1]]) sparkle.push([(at + i) * BAR + s, top[top.length - 1 - k] + 24, 2, 0.32])
      }
    }
  })
  if (section === B) {
    STRAIN_CHORDS.forEach((chord, i) => {
      pad.push(...chord[1].map((pitch): Note => [(at + i) * BAR, pitch + 12, BAR - 0.2, 0.28]))
    })
  }
  const bars = section.melody.length / 4
  for (let i = 0; i < bars; i++) kit(bar + i, (index + i) % 4)
  drums.push([at * BAR, DRUM.ride, 4, 0.24])
  bar += bars
})

// Vinyl dust: deterministic random ticks all through the song.
let seed = 0x5eed
const random = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff
  return seed / 0x7fffffff
}
for (let s = 0; s < bar * 4 * BAR; s += 0.5) {
  const roll = random()
  if (roll < 0.16) dust.push([s, roll < 0.05 ? DRUM.rim : DRUM.hatClosed, 0.2, 0.04 + random() * 0.07])
}

export default {
  title: 'Für Elise (Remy Lo-Fi Mix)',
  bpm: 66,
  stepsPerBeat: 6,
  beatsPerBar: 4,
  length: bar * 4 * BAR,
  loopStart: LOOP * 4 * BAR,
  swing: 0.12,
  room: 0.5,
  echoBeats: 0.5,
  echoFeedback: 0.3,
  parts: [
    { inst: 'piano', notes: piano, vol: 0.6, pan: 0.08, reverb: 0.3, echo: 0.12 },
    { inst: 'flute', notes: flute, vol: 0.58, pan: 0.16, reverb: 0.32, echo: 0.18 },
    { inst: 'music_box', notes: sparkle, vol: 0.3, pan: 0.35, reverb: 0.4, echo: 0.34 },
    { inst: 'epiano', notes: keys, vol: 0.58, pan: -0.15, reverb: 0.26, echo: 0.06 },
    { inst: 'bass_finger', notes: bass, vol: 0.6, pan: 0, reverb: 0.04 },
    { inst: 'pad', notes: pad, vol: 0.18, pan: -0.3, reverb: 0.4 },
    { inst: 'drums', notes: drums, vol: 0.72, pan: 0, reverb: 0.1 },
    { inst: 'drums', notes: dust, vol: 0.5, pan: 0.2, reverb: 0 },
  ],
} satisfies Song
