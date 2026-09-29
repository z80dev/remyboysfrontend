import { DRUM, type Note, type Song } from '../song'

/**
 * "Absolutely No Cabald" — C minor, 132 BPM. Two-bar tiptoe → march A8 / wink B8 / swagger A'8.
 * 43.64-second loop. The brass hook G–Ab–G–Eb–C–Db–C has an exaggerated chromatic eyebrow.
 * B opens with an original, disarmingly sweet Eb-major music-box reply ("I love you"), then
 * borrowed Eb minor and diminished harmony pull the rug out. G7 leads seamlessly back to Cm.
 * Tuba oom / offbeat reed pah; dry side drum, brushed ghost notes, theatrical brass interruptions.
 */
const lead: Note[] = []
const reeds: Note[] = []
const tuba: Note[] = []
const lowSynth: Note[] = []
const musicBox: Note[] = []
const pizzicato: Note[] = []
const brass: Note[] = []
const drums: Note[] = []

type Phrase = [number, number, number][]
const phrase = (notes: Note[], bar: number, line: Phrase, velocity = 0.8) => {
  line.forEach(([step, pitch, length], i) => {
    notes.push([bar * 16 + step, pitch, length, velocity - [0, 0.065, 0.025, 0.09][i % 4]])
  })
}

// A conspiratorial pickup, not the main march: a tritone question and a snare roll.
phrase(lead, 0, [[0, 67, 2], [6, 68, 1], [8, 67, 2], [14, 61, 1]], 0.7)
phrase(lead, 1, [[0, 62, 2], [4, 65, 2], [8, 71, 4], [14, 67, 1]], 0.78)
phrase(tuba, 0, [[0, 36, 3], [8, 43, 3]], 0.84)
phrase(tuba, 1, [[0, 31, 3], [8, 38, 3]], 0.84)
for (const step of [16, 20, 24, 26, 28, 29, 30, 31]) {
  drums.push([step, DRUM.snare, 0.7, step < 28 ? 0.36 : 0.48 + (step - 28) * 0.09])
}

const harmony: [number, number[]][] = [
  [36, [55, 60, 63]], [36, [55, 60, 63]], [32, [56, 60, 63]], [31, [53, 59, 62]],
  [36, [55, 60, 63]], [41, [56, 60, 65]], [38, [56, 60, 65]], [31, [53, 59, 62]],
  [39, [55, 58, 63]], [34, [53, 58, 62]], [32, [56, 60, 63]], [39, [55, 58, 63]],
  [39, [54, 58, 63]], [36, [54, 57, 60]], [38, [56, 60, 65]], [31, [53, 59, 62]],
  [36, [55, 60, 63]], [32, [56, 60, 63]], [35, [53, 59, 62]], [31, [53, 59, 62]],
  [36, [55, 60, 63]], [32, [56, 60, 63]], [38, [56, 60, 65]], [31, [53, 59, 62]],
]
const march: Phrase[] = [
  [[0, 67, 2.5], [4, 68, 1], [6, 67, 1], [8, 63, 3], [12, 60, 1], [14, 61, 1]],
  [[0, 60, 3], [6, 63, 1], [8, 67, 2], [12, 66, 1], [14, 67, 1]],
  [[0, 68, 3], [4, 67, 1], [6, 68, 1], [8, 72, 3], [12, 75, 2]],
  [[0, 74, 2], [4, 71, 2], [8, 67, 3], [14, 65, 1]],
  [[0, 67, 2.5], [4, 68, 1], [6, 67, 1], [8, 63, 3], [12, 60, 1], [14, 61, 1]],
  [[0, 60, 3], [4, 65, 2], [8, 68, 3], [12, 67, 1], [14, 65, 1]],
  [[0, 65, 3], [4, 68, 2], [8, 72, 3], [12, 68, 2]],
  [[0, 67, 3], [4, 65, 2], [8, 62, 2], [12, 59, 1], [14, 62, 1]],
]
const wink: Phrase[] = [
  [[0, 79, 3], [4, 82, 2], [8, 79, 3], [12, 75, 3]],
  [[0, 77, 3], [4, 74, 2], [8, 70, 6]],
  [[0, 72, 3], [4, 75, 2], [8, 80, 3], [12, 79, 2]],
  [[0, 79, 3], [4, 77, 2], [8, 75, 6]],
  [[0, 66, 3], [4, 70, 2], [8, 75, 3], [12, 73, 2]],
  [[0, 72, 3], [4, 69, 2], [8, 66, 2], [12, 63, 2]],
  [[0, 65, 3], [4, 68, 2], [8, 72, 3], [12, 74, 2]],
  [[0, 71, 3], [4, 67, 2], [8, 65, 2], [12, 62, 1], [14, 59, 1]],
]
const swagger: Phrase[] = [
  march[0],
  [[0, 60, 3], [4, 63, 2], [8, 68, 3], [12, 67, 1], [14, 68, 1]],
  [[0, 71, 2], [4, 74, 2], [8, 77, 3], [12, 74, 2]],
  [[0, 71, 3], [4, 69, 1], [6, 68, 1], [8, 67, 3], [12, 65, 2]],
  [[0, 75, 3], [4, 74, 1], [6, 75, 1], [8, 72, 3], [12, 67, 2]],
  [[0, 68, 3], [4, 72, 2], [8, 75, 3], [12, 72, 2]],
  [[0, 74, 3], [4, 72, 2], [8, 68, 3], [12, 65, 2]],
  [[0, 67, 3], [4, 65, 2], [8, 62, 2], [12, 59, 1], [14, 62, 1]],
]

harmony.forEach(([root, chord], index) => {
  const bar = index + 2
  const sweet = index >= 8 && index < 12
  const n = index % 8
  const line = index < 8 ? march[n] : index < 16 ? wink[n] : swagger[n]
  phrase(sweet ? musicBox : lead, bar, line, sweet ? 0.86 : 0.83)
  // The innocent melody loses a semitone (G to Gb) when the brass returns in Eb minor.
  if (index === 12) {
    phrase(musicBox, bar, [[0, 78, 2], [4, 82, 2]], 0.54)
    for (const pitch of [54, 58, 63]) brass.push([bar * 16 + 8, pitch, 4, 0.9])
  }
  const fifth = root + (index === 6 || index === 13 || index === 14 || index === 18 || index === 22 ? 6 : 7)
  phrase(tuba, bar, [[0, root, 2.7], [8, fifth, 2.7]], sweet ? 0.68 : 0.87)
  if (!sweet && index >= 16) {
    phrase(lowSynth, bar, [[0, root, 2], [7, root + 12, 0.7], [8, root, 2], [15, root + 12, 0.7]], 0.67)
  }
  for (const step of [4, 12]) {
    for (const pitch of chord) reeds.push([bar * 16 + step, pitch, 1.7, sweet ? 0.5 : 0.66])
  }
  // Walking inner line, deliberately above the low brass; rests leave room for the slogan's wink.
  if (!sweet) {
    const inner = [chord[0], chord[1], chord[2], chord[1]]
    inner.forEach((pitch, i) => pizzicato.push([bar * 16 + i * 4 + 2, pitch, 1.3, i % 2 ? 0.53 : 0.62]))
  }
  if (index >= 16 && n % 2 === 0) {
    phrase(musicBox, bar, [[10, chord[1] + 24, 1.5], [14, chord[2] + 24, 1.5]], 0.45)
  }
  if ((n === 0 && !sweet) || index === 19) {
    for (const pitch of chord) brass.push([bar * 16, pitch, 2, 0.72])
  }
  for (const step of [0, 8]) drums.push([bar * 16 + step, DRUM.kick, 0.8, sweet ? 0.55 : 0.76])
  for (const step of [4, 12]) drums.push([bar * 16 + step, sweet ? DRUM.rim : DRUM.snare, 0.8, sweet ? 0.52 : 0.75])
  for (const step of [3, 7, 11, 15]) {
    drums.push([bar * 16 + step, DRUM.snare, 0.5, sweet ? 0.14 : 0.22 + (step === 15 ? 0.08 : 0)])
  }
  for (const step of [2, 6, 10, 14]) drums.push([bar * 16 + step, DRUM.hatClosed, 0.7, 0.29])
  if (n === 7) {
    for (const step of [12, 13, 14, 15]) drums.push([bar * 16 + step, DRUM.snare, 0.6, 0.44 + (step - 12) * 0.09])
  }
  if (index === 0 || index === 12 || index === 16) drums.push([bar * 16, DRUM.crash, 1, 0.5])
})

export default {
  title: 'Absolutely No Cabald', bpm: 132, stepsPerBeat: 4, beatsPerBar: 4,
  length: 26 * 16, loopStart: 2 * 16, swing: 0.06, room: 0.34, echoBeats: 0.5, echoFeedback: 0.12,
  parts: [
    { inst: 'trumpet', notes: lead, vol: 0.65, pan: -0.13, reverb: 0.17 },
    { inst: 'accordion', notes: reeds, vol: 0.29, pan: 0.25, reverb: 0.12 },
    { inst: 'tuba', notes: tuba, vol: 0.61, pan: -0.03, reverb: 0.1 },
    { inst: 'bass_saw', notes: lowSynth, vol: 0.25, pan: 0, reverb: 0.02 },
    { inst: 'music_box', notes: musicBox, vol: 0.69, pan: 0.13, reverb: 0.23, echo: 0.09 },
    { inst: 'strings_stacc', notes: pizzicato, vol: 0.36, pan: -0.3, reverb: 0.16 },
    { inst: 'brass', notes: brass, vol: 0.4, pan: 0.1, reverb: 0.22 },
    { inst: 'drums', notes: drums, vol: 0.54, pan: 0, reverb: 0.1 },
  ],
} satisfies Song
