import { DRUM, type Note, type Song } from '../song'

/**
 * Liquidity City — Eb major, 118 BPM. Intro2 → street-corner A8 → sunset B8 → borrowed-color bridge4 → A'4.
 * Original hook: Eb–G–F / Bb–G–Eb, with a late D–F pickup; the rests are part of the tune.
 * Ninth-rich rootless keys, C7→Fm and G7→Cm, then a warm borrowed Cbmaj7 before the final Bb13.
 * Slap-bass anticipations and dry guitar answer a trumpet; B opens into lyrical strings and wider voicings.
 */
const trumpet: Note[] = []
const strings: Note[] = []
const keys: Note[] = []
const guitar: Note[] = []
const bass: Note[] = []
const brass: Note[] = []
const drums: Note[] = []
const hats: Note[] = []
type Figure = [offset: number, pitch: number, duration: number][]

function phrase(target: Note[], bar: number, notes: Figure, velocity: number) {
  for (let i = 0; i < notes.length; i++) {
    const [offset, pitch, duration] = notes[i]
    target.push([bar * 16 + offset, pitch, duration, velocity * (1 - ((i * 3 + bar) % 6) * 0.025)])
  }
}

// A bass-and-keys count-in establishes the pocket, rather than dropping every layer on the first beat.
phrase(bass, 0, [[0, 39, 2.4], [6, 46, 1.2], [8, 51, 1.5], [11, 46, 1.2], [14, 38, 1.3]], 0.78)
phrase(bass, 1, [[0, 46, 2.5], [6, 41, 1.2], [8, 44, 1.4], [11, 45, 1.2], [14, 46, 1.3]], 0.8)
for (const pitch of [55, 62, 65, 70]) keys.push([2, pitch, 5, 0.55])
for (const pitch of [56, 60, 62, 67]) keys.push([22, pitch, 4, 0.53])
phrase(trumpet, 1, [[10, 70, 1.4], [12, 74, 1.4], [14, 77, 1.4]], 0.62)
for (const step of [0, 8, 16, 24]) drums.push([step, DRUM.kick, 0.5, 0.7])
for (const step of [4, 12, 20, 28]) drums.push([step, DRUM.clap, 0.5, 0.45])
for (const step of [2, 6, 10, 14, 18, 22, 26, 30]) hats.push([step, DRUM.hatClosed, 0.4, 0.38])

const melody: Figure[] = [
  [[0, 75, 1.5], [3, 79, 1.4], [6, 77, 2.4], [10, 82, 1.4], [12, 79, 2.5]],
  [[0, 75, 3.5], [6, 74, 1.4], [8, 77, 2.5], [12, 75, 1.5], [15, 72, 0.8]],
  [[0, 77, 2.4], [4, 80, 1.4], [7, 79, 1.4], [10, 77, 3.4]],
  [[2, 74, 1.4], [4, 77, 1.4], [7, 80, 2.4], [11, 79, 1.4], [14, 77, 1.4]],
  [[0, 79, 1.4], [3, 82, 1.4], [6, 77, 2.5], [10, 74, 3.4]],
  [[0, 76, 2.4], [4, 79, 1.4], [7, 82, 2.4], [11, 79, 1.4], [14, 76, 1.4]],
  [[0, 77, 3.4], [6, 80, 1.4], [8, 79, 1.4], [11, 77, 2.4]],
  [[0, 74, 3.4], [6, 72, 1.4], [8, 70, 3.4], [13, 75, 2.3]],
  // Sunset: longer trumpet arcs above softer groove and a real responding string line.
  [[0, 80, 5.4], [6, 79, 1.5], [8, 77, 3.4], [12, 75, 3.4]],
  [[0, 77, 5.4], [6, 80, 1.5], [8, 85, 5.4]],
  [[0, 82, 5.4], [6, 80, 1.5], [8, 79, 3.4], [12, 77, 3.4]],
  [[0, 75, 6.4], [8, 72, 3.4], [12, 75, 3.4]],
  [[0, 77, 5.4], [6, 80, 1.5], [8, 79, 3.4], [12, 77, 3.4]],
  [[0, 74, 3.4], [4, 71, 3.4], [8, 74, 5.4]],
  [[0, 75, 5.4], [6, 79, 1.5], [8, 82, 3.4], [12, 79, 3.4]],
  [[0, 81, 3.4], [4, 79, 3.4], [8, 77, 3.4], [12, 75, 3.4]],
  // The bridge borrows Cb (not a key change); Cb–Bb and Eb–D lead straight into the dominant.
  [[0, 78, 3.4], [4, 75, 5.4], [10, 73, 3.4]],
  [[0, 74, 3.4], [6, 77, 1.4], [8, 80, 3.4], [12, 79, 3.4]],
  [[0, 80, 3.4], [6, 79, 1.4], [8, 75, 3.4], [12, 72, 3.4]],
  [[0, 74, 3.4], [6, 77, 1.4], [8, 70, 3.4], [12, 74, 1.4], [14, 77, 1.4]],
  [[0, 75, 1.5], [3, 79, 1.4], [6, 77, 2.4], [10, 82, 1.4], [12, 79, 2.5]],
  [[0, 75, 3.4], [6, 79, 1.4], [8, 82, 2.4], [12, 79, 1.4], [14, 75, 1.4]],
  [[0, 77, 2.4], [4, 80, 1.4], [7, 79, 1.4], [10, 77, 3.4]],
  [[2, 74, 1.4], [4, 77, 1.4], [7, 80, 2.4], [11, 77, 1.4], [14, 74, 1.4]],
]

// Rootless voicings avoid bass mud: thirds/sevenths move by step, ninths remain common tones.
const voicings = [
  [55, 62, 65, 70], [55, 62, 63, 70], [56, 63, 67, 72], [56, 62, 65, 67],
  [58, 62, 65, 69], [58, 62, 64, 69], [56, 63, 67, 72], [56, 62, 65, 67],
  [55, 60, 63, 70], [56, 60, 61, 65], [55, 61, 65, 72], [55, 60, 63, 70],
  [56, 60, 63, 67], [55, 59, 62, 65], [55, 58, 62, 63], [57, 60, 63, 67],
  [54, 58, 63, 66], [56, 62, 65, 67], [55, 60, 63, 70], [56, 62, 65, 67],
  [55, 62, 65, 70], [55, 62, 63, 70], [56, 63, 67, 72], [56, 62, 65, 67],
]
const roots = [39, 36, 41, 46, 43, 36, 41, 46, 44, 46, 39, 44, 41, 43, 36, 41, 35, 46, 44, 46, 39, 36, 41, 46]
const thirds = [43, 39, 44, 50, 46, 40, 44, 50, 48, 49, 43, 48, 44, 47, 39, 45, 39, 50, 48, 50, 43, 39, 44, 50]
const response: Figure[] = [
  [[0, 67, 6], [8, 70, 6]], [[0, 68, 6], [8, 65, 6]],
  [[0, 67, 6], [8, 70, 6]], [[0, 72, 6], [8, 67, 6]],
  [[0, 68, 6], [8, 63, 6]], [[0, 65, 6], [8, 62, 6]],
  [[0, 63, 6], [8, 67, 6]], [[0, 69, 6], [8, 67, 6]],
]

for (let sectionBar = 0; sectionBar < 24; sectionBar++) {
  const bar = sectionBar + 2
  const smooth = sectionBar >= 8 && sectionBar < 16
  const bridge = sectionBar >= 16 && sectionBar < 20
  phrase(trumpet, bar, melody[sectionBar], smooth ? 0.73 : bridge ? 0.69 : 0.83)
  const chord = voicings[sectionBar]
  const chops = smooth ? [2, 10] : bridge ? [0, 10] : [2, 6, 11, 14]
  for (const offset of chops) {
    for (const pitch of chord) keys.push([bar * 16 + offset, pitch, smooth ? 4.5 : 1.35, offset === 2 ? 0.63 : 0.53])
  }
  if (!bridge) {
    for (const offset of [3, 7, 15]) {
      for (const pitch of chord.slice(1, 3)) guitar.push([bar * 16 + offset, pitch + 12, 0.7, smooth ? 0.33 : 0.43])
    }
  }
  const root = roots[sectionBar]
  const next = roots[(sectionBar + 1) % 24]
  const approach = next > root ? next - 1 : next + 1
  const bassFigure: Figure = smooth
    ? [[0, root, 3], [6, root + 7, 1.3], [8, root + 12, 2.4], [12, thirds[sectionBar], 1.3], [14, approach, 1.3]]
    : [[0, root, 2.4], [3, root + 12, 0.7], [6, root + 7, 1.2], [8, root, 1.5],
      [11, thirds[sectionBar], 1.2], [13, root + 12, 0.7], [14, approach, 1.3]]
  phrase(bass, bar, bassFigure, bridge ? 0.72 : 0.87)
  if (smooth) phrase(strings, bar, response[sectionBar - 8], 0.57)
  if (bridge) phrase(strings, bar, [[0, chord[1] + 12, 7], [8, chord[0] + 12, 7]], 0.51)
  // Brass punctuates the holes in the hook, never doubling every keyboard chord.
  if (!smooth && !bridge && sectionBar % 2 === 0) {
    for (const pitch of [chord[0] + 12, chord[1] + 12, chord[2] + 12]) {
      brass.push([bar * 16 + 8, pitch, 1.2, 0.6])
      brass.push([bar * 16 + 15, pitch, 0.7, 0.43])
    }
  }
  for (const offset of [0, 4, 8, 12]) drums.push([bar * 16 + offset, DRUM.kick, 0.5, offset % 8 ? 0.65 : 0.85])
  if (!smooth && sectionBar % 2 === 1) drums.push([bar * 16 + 10, DRUM.kick, 0.4, 0.48])
  for (const offset of [4, 12]) {
    drums.push([bar * 16 + offset, DRUM.snare, 0.5, smooth ? 0.52 : 0.6])
    drums.push([bar * 16 + offset + 0.055, DRUM.clap, 0.5, smooth ? 0.4 : 0.51])
  }
  if (sectionBar % 2 === 0) drums.push([bar * 16 + 11, DRUM.snare, 0.4, 0.2])
  for (const offset of [0, 2, 4, 6, 8, 10, 12, 14]) {
    const open = offset === 6 || (offset === 14 && !bridge)
    hats.push([bar * 16 + offset, open ? DRUM.hatOpen : DRUM.hatClosed, open ? 1.1 : 0.4,
      open ? 0.41 : offset % 4 ? 0.4 : 0.28])
  }
  if (sectionBar === 0 || sectionBar === 8 || sectionBar === 20) drums.push([bar * 16, DRUM.crash, 2, 0.38])
  if (sectionBar === 7 || sectionBar === 15 || sectionBar === 19) {
    phrase(drums, bar, [[13, DRUM.tomHigh, 0.5], [14, DRUM.tomMid, 0.5], [15, DRUM.tomLow, 0.5]], 0.52)
  }
}

const city: Song = {
  title: 'Liquidity City — Golden-Hour Boulevard',
  bpm: 118,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: 26 * 16,
  loopStart: 2 * 16,
  swing: 0.13,
  room: 0.4,
  echoBeats: 0.75,
  echoFeedback: 0.13,
  parts: [
    { inst: 'trumpet', notes: trumpet, vol: 0.58, pan: -0.08, reverb: 0.2, echo: 0.06 },
    { inst: 'strings', notes: strings, vol: 0.4, pan: 0.23, reverb: 0.3 },
    { inst: 'epiano', notes: keys, vol: 0.46, pan: -0.22, reverb: 0.14 },
    { inst: 'guitar', notes: guitar, vol: 0.37, pan: 0.32, reverb: 0.08 },
    { inst: 'bass_slap', notes: bass, vol: 0.68, pan: 0, reverb: 0.025 },
    { inst: 'brass', notes: brass, vol: 0.4, pan: 0.1, reverb: 0.16 },
    { inst: 'drums', notes: drums, vol: 0.67, pan: 0, reverb: 0.08 },
    { inst: 'drums', notes: hats, vol: 0.46, pan: 0.24, reverb: 0.06 },
  ],
}

export default city
