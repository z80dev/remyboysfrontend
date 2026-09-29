import { DRUM, type Note, type Song } from '../song'

/**
 * "Stand Your Ground" — D minor, 168 BPM. Two-bar challenge → A8 / B8 / bridge8 / A'8 (45.71s loop).
 * Original hook: D–A–C–D, F–E–D–C#; the falling semitone answers the opening fourth/fifth.
 * Trumpet and violin trade the hook, then unite over F major; the bridge borrows Eb before A7.
 * Upper chord voices move by step wherever possible; low bass is single-line, never block-chord doubled.
 */
const trumpet: Note[] = []
const violin: Note[] = []
const strings: Note[] = []
const staccato: Note[] = []
const bass: Note[] = []
const brass: Note[] = []
const drums: Note[] = []
const harp: Note[] = []

type Phrase = [number, number, number][]
const phrase = (notes: Note[], bar: number, line: Phrase, velocity = 0.86) => {
  line.forEach(([step, pitch, length], i) => {
    notes.push([bar * 16 + step, pitch, length, velocity - [0, 0.08, 0.035, 0.06][i % 4]])
  })
}
const hit = (bar: number, step: number, drum: number, velocity: number) =>
  drums.push([bar * 16 + step, drum, 0.8, velocity])

// A quick unison challenge, answered by descending toms; this never repeats at the seam.
phrase(trumpet, 0, [[0, 62, 1.5], [2, 69, 1.5], [4, 72, 1.5], [6, 74, 3], [10, 77, 1.5], [12, 76, 3]])
phrase(trumpet, 1, [[0, 74, 2], [3, 73, 2], [6, 69, 3], [10, 73, 1], [12, 76, 1], [14, 81, 1]])
phrase(bass, 0, [[0, 38, 3], [4, 38, 3], [8, 41, 3], [12, 43, 3]], 0.9)
phrase(bass, 1, [[0, 45, 5], [8, 45, 3], [12, 33, 3]], 0.9)
for (const [step, pitch] of [[0, 50], [0, 57], [0, 62], [16, 49], [16, 55], [16, 61]]) {
  brass.push([step, pitch, 5, 0.83])
}
hit(0, 0, DRUM.crash, 0.8)
for (let bar = 0; bar < 2; bar++) {
  for (const step of [0, 4, 8, 12]) hit(bar, step, DRUM.kick, 0.85)
  hit(bar, 4, DRUM.snare, 0.85)
  hit(bar, 12, DRUM.snare, 0.92)
}
for (const [step, drum] of [[8, DRUM.tomHigh], [10, DRUM.tomHigh], [12, DRUM.tomMid], [14, DRUM.tomLow]]) {
  hit(1, step, drum, 0.9)
}

// Each voicing is ordered low → high; inversions keep the accompaniment out of the solo register.
const harmony: [number, number[]][] = [
  [38, [53, 57, 62]], [34, [53, 58, 62]], [43, [55, 58, 62]], [45, [55, 61, 64]],
  [38, [53, 57, 62]], [36, [52, 55, 60]], [34, [53, 58, 62]], [45, [55, 61, 64]],
  [41, [53, 57, 60]], [40, [52, 55, 60]], [38, [53, 57, 62]], [34, [53, 58, 62]],
  [43, [55, 58, 62]], [41, [53, 57, 62]], [40, [55, 58, 62]], [45, [55, 61, 64]],
  [43, [55, 58, 62]], [41, [53, 57, 62]], [39, [55, 58, 63]], [38, [53, 58, 62]],
  [43, [55, 58, 62]], [45, [55, 61, 64]], [38, [53, 57, 62]], [45, [55, 61, 64]],
  [38, [53, 57, 62]], [34, [53, 58, 62]], [43, [55, 58, 62]], [45, [55, 61, 64]],
  [41, [53, 57, 60]], [34, [53, 58, 62]], [40, [55, 58, 62]], [45, [55, 61, 64]],
]
const theme: Phrase[] = [
  [[0, 74, 3], [4, 69, 1.5], [6, 72, 1.5], [8, 74, 5], [14, 77, 1.5]],
  [[0, 77, 3], [4, 76, 1.5], [6, 74, 1.5], [8, 70, 5], [14, 69, 1.5]],
  [[0, 67, 3], [4, 70, 1.5], [6, 74, 1.5], [8, 79, 3], [12, 77, 3]],
  [[0, 76, 3], [4, 73, 1.5], [6, 69, 1.5], [8, 73, 3], [12, 76, 1.5], [14, 73, 1.5]],
  [[0, 74, 3], [4, 69, 1.5], [6, 72, 1.5], [8, 74, 3], [12, 77, 3]],
  [[0, 79, 5], [6, 76, 1.5], [8, 72, 3], [12, 74, 1.5], [14, 76, 1.5]],
  [[0, 77, 3], [4, 74, 3], [8, 70, 3], [12, 74, 3]],
  [[0, 76, 3], [4, 73, 3], [8, 69, 3], [12, 72, 1.5], [14, 73, 1.5]],
]
const triumph: Phrase[] = [
  [[0, 77, 5], [6, 76, 1.5], [8, 77, 3], [12, 81, 3]],
  [[0, 79, 5], [6, 76, 1.5], [8, 72, 5], [14, 76, 1.5]],
  [[0, 77, 3], [4, 74, 3], [8, 69, 3], [12, 72, 1.5], [14, 74, 1.5]],
  [[0, 77, 6], [8, 74, 3], [12, 70, 3]],
  [[0, 79, 5], [6, 77, 1.5], [8, 74, 3], [12, 70, 3]],
  [[0, 77, 3], [4, 76, 1.5], [6, 74, 1.5], [8, 69, 6]],
  [[0, 76, 3], [4, 74, 3], [8, 70, 3], [12, 67, 3]],
  [[0, 69, 3], [4, 73, 3], [8, 76, 3], [12, 79, 3]],
]
const bridge: Phrase[] = [
  [[0, 70, 6], [8, 69, 3], [12, 67, 3]],
  [[0, 69, 5], [6, 72, 1.5], [8, 74, 6]],
  [[0, 75, 5], [6, 74, 1.5], [8, 70, 6]],
  [[0, 74, 3], [4, 70, 3], [8, 65, 6]],
  [[0, 67, 3], [4, 70, 3], [8, 74, 3], [12, 77, 3]],
  [[0, 76, 3], [4, 73, 3], [8, 69, 3], [12, 67, 3]],
  [[0, 65, 3], [4, 69, 3], [8, 74, 5], [14, 72, 1.5]],
  [[0, 73, 3], [4, 76, 3], [8, 79, 3], [12, 81, 3]],
]

harmony.forEach(([root, chord], sectionBar) => {
  const bar = sectionBar + 2
  const section = Math.floor(sectionBar / 8)
  const n = sectionBar % 8
  const isBridge = section === 2
  const line = section === 1 ? triumph[n] : isBridge ? bridge[n] : theme[n]
  const solo = section === 1 || (section === 0 && n >= 4) || isBridge ? violin : trumpet
  phrase(solo, bar, line, isBridge ? 0.78 : 0.9)
  // A second voice answers between long solo notes, rather than doubling every melody attack.
  if (section === 1 || section === 3) {
    phrase(solo === trumpet ? violin : trumpet, bar,
      [[2, chord[1] + 12, 3], [7, chord[0] + 12, 2], [11, chord[1] + 12, 3]], 0.64)
  }
  const nextRoot = harmony[(sectionBar + 1) % harmony.length][0]
  const approach = nextRoot > root ? nextRoot - 1 : nextRoot + 1
  phrase(bass, bar, [[0, root, 2.5], [3, root, 0.8], [4, root + 12, 1.5], [6, root, 1.5],
    [8, root, 2.5], [11, root + 12, 0.8], [12, root, 1.5], [14, approach, 1.5]], isBridge ? 0.78 : 0.9)
  if (isBridge || section === 1) {
    for (const pitch of chord) strings.push([bar * 16, pitch, 15.5, isBridge ? 0.65 : 0.73])
  }
  for (let i = 0; i < 8; i++) {
    if (isBridge && i % 2 === 1) continue
    staccato.push([bar * 16 + i * 2, chord[[0, 2, 1, 2][i % 4]], 1.15, 0.66 + (i % 4 === 0 ? 0.12 : 0)])
  }
  if (n === 0 || n === 4) {
    for (const pitch of chord) brass.push([bar * 16, pitch, 2.5, 0.72])
    hit(bar, 0, DRUM.crash, n === 0 ? 0.75 : 0.56)
  }
  if (section === 1 && n % 2 === 0) {
    chord.forEach((pitch, i) => harp.push([bar * 16 + 8 + i * 2, pitch + 12, 4, 0.66]))
  }
  for (const step of (isBridge ? [0, 8, 10] : [0, 6, 8, 14])) hit(bar, step, DRUM.kick, step === 0 ? 0.93 : 0.78)
  for (const step of [4, 12]) hit(bar, step, DRUM.snare, step === 4 ? 0.84 : 0.92)
  for (let step = 0; step < 16; step += 2) {
    hit(bar, step, section === 1 ? DRUM.ride : DRUM.hatClosed, step % 4 === 0 ? 0.52 : 0.36)
  }
  if (n === 3) hit(bar, 15, DRUM.snare, 0.4)
  if (n === 7) {
    for (const [step, drum] of [[10, DRUM.tomHigh], [12, DRUM.tomMid], [13, DRUM.tomMid], [14, DRUM.tomLow], [15, DRUM.snare]]) {
      hit(bar, step, drum, 0.73 + (step % 2 === 0 ? 0.12 : 0))
    }
  }
})

export default {
  title: 'Stand Your Ground', bpm: 168, stepsPerBeat: 4, beatsPerBar: 4,
  length: 34 * 16, loopStart: 2 * 16, room: 0.48, echoBeats: 0.75, echoFeedback: 0.18,
  parts: [
    { inst: 'trumpet', notes: trumpet, vol: 0.52, pan: -0.16, reverb: 0.19, echo: 0.09 },
    { inst: 'violin', notes: violin, vol: 0.57, pan: 0.17, reverb: 0.22, echo: 0.08 },
    { inst: 'strings', notes: strings, vol: 0.19, pan: -0.3, reverb: 0.28 },
    { inst: 'strings_stacc', notes: staccato, vol: 0.28, pan: 0.3, reverb: 0.14 },
    { inst: 'bass_saw', notes: bass, vol: 0.46, pan: 0, reverb: 0.03 },
    { inst: 'brass', notes: brass, vol: 0.29, pan: -0.05, reverb: 0.22 },
    { inst: 'harp', notes: harp, vol: 0.32, pan: 0.35, reverb: 0.3 },
    { inst: 'drums', notes: drums, vol: 0.51, pan: 0, reverb: 0.12 },
  ],
} satisfies Song
