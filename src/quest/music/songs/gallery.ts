import { DRUM, type Note, type Song } from '../song'

/**
 * The Frames Are Listening — Eb major, 104 bpm, lightly swung eighths. Two-bar
 * invitation → A8 (Rhodes hook) → B8 (marimba conversation) → four-bar coda,
 * then back to A: 46.15 seconds of gallery wandering. Original hook G–Bb–F–G,
 * Eb–D–C–Bb; rootless piano shells move by semitone through ii–V side doors.
 * Aø–D7 visits G minor; Abm6 is the unexpected shadow in the final frame.
 * The walking bass has its own composed chromatic approaches, not parallel roots.
 */
const bar = 8
const intro = 2
const pianoLead: Note[] = []
const comp: Note[] = []
const vibes: Note[] = []
const bells: Note[] = []
const bass: Note[] = []
const drums: Note[] = []
const strings: Note[] = []

// Four-note rootless piano voicings: thirds and sevenths are inner guide tones.
const chords: number[][] = [
  [55, 62, 65, 70], [56, 60, 62, 67],
  [55, 60, 65, 70], [55, 58, 62, 67], [56, 60, 63, 67], [56, 60, 62, 67],
  [53, 57, 58, 62], [52, 58, 62, 69], [56, 60, 63, 67], [56, 60, 62, 67],
  [55, 58, 60, 63], [55, 60, 63, 69], [54, 60, 63, 69], [53, 57, 58, 62],
  [52, 58, 62, 69], [56, 60, 63, 67], [56, 60, 62, 67], [55, 58, 62, 65],
  [55, 58, 60, 63], [54, 59, 60, 63], [55, 60, 63, 65], [56, 60, 62, 67],
]
const walk: number[][] = [
  [39, 46, 50, 45], [46, 41, 44, 38],
  [39, 43, 46, 47], [48, 43, 46, 40], [41, 44, 48, 45], [46, 44, 41, 42],
  [43, 46, 50, 47], [48, 43, 46, 40], [41, 44, 48, 45], [46, 41, 44, 43],
  [44, 48, 51, 44], [45, 48, 51, 49], [50, 45, 48, 42], [43, 46, 50, 47],
  [48, 43, 46, 40], [41, 44, 48, 45], [46, 41, 44, 38], [39, 43, 46, 43],
  [44, 48, 51, 43], [44, 47, 48, 45], [46, 43, 39, 45], [46, 41, 44, 38],
]
const a: Note[][] = [
  [[0, 79, 1, .84], [1, 82, 1.7, .80], [3, 77, .8, .74], [4, 79, 2.7, .87], [7, 75, .8, .76]],
  [[0, 74, 1.8, .79], [2, 72, 1, .74], [3, 70, 2.5, .76], [6, 74, 1.7, .78]],
  [[1, 75, 1, .82], [2, 79, 1.6, .83], [4, 80, 1.8, .87], [6, 79, .8, .76], [7, 75, .8, .73]],
  [[0, 74, 2.7, .79], [3, 72, .8, .74], [4, 74, 1.7, .81], [6, 77, 1.6, .83]],
  [[0, 79, 1, .85], [1, 82, 1.8, .82], [3, 77, .8, .77], [4, 79, 2.6, .84]],
  [[1, 81, .9, .84], [2, 79, 1.8, .79], [4, 76, 1.7, .79], [6, 74, .8, .73], [7, 72, .8, .74]],
  [[0, 75, 1.8, .81], [2, 72, 1, .75], [3, 68, 2.6, .77], [6, 72, 1.7, .76]],
  [[0, 74, 2.7, .80], [3, 77, 1, .78], [4, 79, 1.7, .83], [6, 77, .8, .75], [7, 75, .8, .75]],
]
const b: Note[][] = [
  [[0, 79, 2.5, .78], [3, 75, .8, .72], [4, 72, 1.8, .76], [6, 70, 1.6, .71]],
  [[1, 75, .8, .75], [2, 72, 1.8, .72], [4, 69, 2.5, .77], [7, 72, .8, .71]],
  [[0, 75, 1.7, .79], [2, 78, 1, .80], [3, 81, 2.6, .84], [6, 78, 1.7, .76]],
  [[0, 79, 2.6, .83], [3, 77, .8, .73], [4, 74, 1.8, .75], [6, 70, 1.6, .70]],
  [[1, 72, 1, .74], [2, 76, 1.7, .79], [4, 79, 1.7, .80], [6, 81, 1.6, .82]],
  [[0, 80, 2.5, .83], [3, 79, .8, .72], [4, 75, 1.7, .76], [6, 72, 1.7, .73]],
  [[1, 74, 1, .75], [2, 77, 1.7, .77], [4, 79, 1.7, .81], [6, 80, .8, .77], [7, 77, .8, .72]],
  [[0, 79, 2.6, .80], [3, 77, .8, .72], [4, 75, 2.7, .75]],
]
const coda: Note[][] = [
  [[0, 79, 1, .84], [1, 82, 1.7, .81], [3, 77, .8, .74], [4, 79, 2.7, .84]],
  [[1, 78, 1.7, .81], [3, 75, .8, .74], [4, 72, 1.7, .77], [6, 71, 1.7, .72]],
  [[0, 75, 3.6, .81], [4, 77, 1.7, .75], [6, 79, 1.6, .78]],
  [[0, 77, 1.7, .78], [2, 74, 1.7, .73], [4, 72, 1, .71], [5, 70, 1.7, .70]],
]
function phrase(target: Note[], bars: Note[][], start: number) {
  bars.forEach((notes, i) => {
    for (const [step, pitch, length, velocity] of notes) {
      target.push([(start + i) * bar + step, pitch, length, velocity])
    }
  })
}
phrase(pianoLead, a, intro)
phrase(vibes, b, intro + 8)
phrase(pianoLead, coda, intro + 16)

chords.forEach((chord, i) => {
  const t = i * bar
  const opening = i < intro
  const bridge = i >= 10 && i < 18
  // Anticipated, varied comping, with room for the head of each melody phrase.
  const hits = opening ? [0, 5] : i % 2 ? [1, 4, 7] : [0, 3, 6]
  hits.forEach((step, hit) => {
    for (let v = 0; v < chord.length; v++) {
      const length = i === chords.length - 1 && step === 7 ? .7 : hit === 0 ? 1.8 : 1.1
      comp.push([t + step + v * .025, chord[v], length,
        (opening ? .54 : bridge ? .48 : .41) - v * .025 + (hit === 1 ? .04 : 0)])
    }
  })
  walk[i].forEach((pitch, beat) => {
    bass.push([t + beat * 2, pitch, 1.72, .66 + (beat === 0 ? .09 : beat === 2 ? .04 : 0)])
  })
  if (!opening) {
    drums.push([t, DRUM.kick, .35, .27], [t + 4, DRUM.kick, .35, .19])
    drums.push([t + 2, DRUM.rim, .25, .40], [t + 6, DRUM.rim, .25, .35])
    for (const beat of [0, 2, 3, 4, 6, 7]) {
      drums.push([t + beat, DRUM.ride, .55, beat % 2 ? .17 : .26])
    }
    for (let beat = 0; beat < bar; beat++) {
      drums.push([t + beat, DRUM.shaker, .3, beat % 2 ? .19 : .25])
    }
  }
  if (i === 10 || i === 13 || i === 17 || i === 19) {
    for (const pitch of chord.slice(1)) strings.push([t, pitch + 12, 7.4, .36])
  }
})
// Mallet replies in A's phrase endings; bell highlights never double an entire line.
vibes.push([5 * bar + 6, 67, .8, .47], [5 * bar + 7, 70, .8, .43])
vibes.push([9 * bar + 5, 67, .8, .49], [9 * bar + 6, 70, 1.5, .45])
bells.push([0, 82, 3, .37], [8 + 5, 86, 2, .28], [18 * bar, 87, 3, .30])

export default {
  title: 'The Frames Are Listening',
  bpm: 104,
  stepsPerBeat: 2,
  beatsPerBar: 4,
  length: chords.length * bar,
  loopStart: intro * bar,
  swing: .19,
  room: .34,
  echoBeats: .75,
  echoFeedback: .10,
  parts: [
    { inst: 'epiano', notes: pianoLead, vol: .80, pan: -.09, reverb: .21, echo: .025 },
    { inst: 'epiano', notes: comp, vol: .46, pan: -.23, reverb: .18 },
    { inst: 'marimba', notes: vibes, vol: .95, pan: .21, reverb: .30, echo: .035 },
    { inst: 'bell', notes: bells, vol: .34, pan: .32, reverb: .34 },
    { inst: 'bass_finger', notes: bass, vol: .54, pan: 0, reverb: .04 },
    { inst: 'drums', notes: drums, vol: .54, pan: .06, reverb: .12 },
    { inst: 'strings', notes: strings, vol: .27, pan: .05, reverb: .35 },
  ],
} satisfies Song
