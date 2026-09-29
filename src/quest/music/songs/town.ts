import { DRUM, type Note, type Song } from '../song'

/**
 * Windows Warm at Dusk — D major, 90 bpm, 3/4. Two-bar porch-light intro, then
 * A (8), B (8), A' (8): a 48-second loop. Original hook: F#–A–B, A–F#–E–D;
 * its falling answer becomes a rising flute conversation in B. Gmaj7 → Gm6
 * is the bittersweet IV–iv homecoming; B7/E7/F#7 gently open the harmony.
 * Upper voices stay close; the harp and guitar leave the low register to bass.
 */
const bar = 6
const intro = 2
const melody: Note[] = []
const flute: Note[] = []
const harp: Note[] = []
const guitar: Note[] = []
const strings: Note[] = []
const bass: Note[] = []
const drums: Note[] = []
const chimes: Note[] = []

// Bass, then four independently voice-led upper tones (not root-position stacks).
const harmony: [number, number, number, number, number][] = [
  [38, 57, 61, 64, 66], [45, 55, 61, 64, 69],
  [38, 57, 61, 64, 66], [42, 57, 61, 64, 69],
  [43, 55, 59, 62, 66], [43, 55, 58, 62, 64],
  [42, 57, 62, 64, 66], [35, 57, 59, 63, 66],
  [40, 55, 59, 62, 66], [45, 55, 61, 64, 67],
  [43, 57, 59, 62, 66], [43, 57, 61, 64, 69],
  [42, 57, 61, 64, 69], [35, 57, 59, 63, 66],
  [40, 55, 59, 62, 66], [40, 56, 59, 62, 66],
  [45, 57, 62, 64, 69], [45, 55, 61, 64, 67],
  [38, 57, 61, 64, 66], [42, 58, 61, 64, 66],
  [35, 57, 59, 62, 66], [38, 57, 60, 62, 66],
  [43, 55, 59, 62, 66], [43, 55, 58, 62, 64],
  [45, 57, 62, 64, 66], [45, 55, 61, 64, 67],
]

// Each row is a composed bar: [eighth-note position, MIDI, duration, velocity].
const theme: Note[][] = [
  [[0, 78, 1, .84], [1, 81, 1, .79], [2, 83, 1.8, .88], [4, 81, 1, .79], [5, 78, .9, .73]],
  [[0, 76, 2, .79], [2, 73, 1, .72], [3, 76, 1, .76], [4, 78, 1.7, .81]],
  [[0, 79, 2.8, .84], [3, 78, 1, .73], [4, 76, 1, .74], [5, 74, .8, .70]],
  [[0, 76, 2, .78], [2, 74, 1.7, .76], [4, 70, 1.7, .70]],
  [[0, 74, 1, .77], [1, 78, 1, .81], [2, 81, 2.7, .86], [5, 78, .8, .73]],
  [[0, 78, 1.8, .80], [2, 75, 1, .75], [3, 78, 1, .80], [4, 81, 1.8, .84]],
  [[0, 79, 1.8, .82], [2, 78, 1, .73], [3, 76, 1, .75], [4, 74, 1.8, .78]],
  [[0, 73, 2.7, .77], [3, 71, .8, .66], [4, 73, 1.7, .74]],
]
const middle: Note[][] = [
  [[0, 71, 1, .75], [1, 74, 1, .77], [2, 78, 2.7, .83], [5, 79, .8, .78]],
  [[0, 81, 2, .86], [2, 79, 1, .78], [3, 76, 1, .75], [4, 73, 1.8, .76]],
  [[0, 73, 1, .75], [1, 76, 1, .78], [2, 81, 2.6, .85], [5, 83, .8, .81]],
  [[0, 81, 1.8, .81], [2, 78, 1, .77], [3, 75, 1, .76], [4, 71, 1.8, .74]],
  [[0, 71, 1, .74], [1, 74, 1, .78], [2, 78, 2, .83], [4, 79, 1.7, .84]],
  [[0, 80, 2.6, .86], [3, 78, .8, .78], [4, 76, 1.8, .78]],
  [[0, 74, 2, .77], [2, 76, 1, .80], [3, 81, 2.7, .87]],
  [[0, 79, 2, .79], [2, 76, 1, .74], [3, 73, 1, .74], [4, 76, 1.7, .78]],
]
const homecoming: Note[][] = [
  theme[0],
  [[0, 82, 2, .86], [2, 81, 1, .77], [3, 78, 1, .78], [4, 76, 1.7, .74]],
  [[0, 78, 2, .84], [2, 74, 1, .75], [3, 73, 1, .73], [4, 71, 1.8, .78]],
  [[0, 74, 1, .79], [1, 78, 1, .83], [2, 81, 2.7, .86], [5, 78, .8, .75]],
  [[0, 79, 2.8, .84], [3, 78, 1, .76], [4, 74, 1.8, .78]],
  [[0, 76, 2, .80], [2, 74, 1.8, .76], [4, 70, 1.7, .71]],
  [[0, 74, 3.8, .82], [4, 76, 1, .75], [5, 78, .8, .78]],
  [[0, 76, 1.8, .77], [2, 73, 1.8, .74], [4, 69, 1.6, .67]],
]

function phrase(target: Note[], bars: Note[][], start: number) {
  bars.forEach((notes, b) => {
    for (const [step, pitch, length, velocity] of notes) {
      target.push([(start + b) * bar + step, pitch, length, velocity])
    }
  })
}
phrase(melody, theme, intro)
phrase(flute, middle, intro + 8)
phrase(melody, homecoming, intro + 16)

harmony.forEach(([root, ...voices], b) => {
  const t = b * bar
  const opening = b < intro
  const lift = b >= 10 && b < 18
  const arpOrder = b % 2 ? [0, 2, 1, 3, 2, 1] : [0, 1, 2, 3, 2, 1]
  arpOrder.forEach((voice, beat) => {
    const length = b === harmony.length - 1 && beat === 5 ? .9 : 1.8
    harp.push([t + beat, voices[voice], length, (opening ? .64 : .51) + (beat === 0 ? .08 : 0) - beat * .009])
  })
  bass.push([t, root, 3.7, opening ? .56 : .68], [t + 4, root + 12, 1.6, .49])
  if (!opening) {
    for (const beat of [2, 4]) {
      guitar.push([t + beat, voices[1], 1.3, beat === 2 ? .48 : .42])
      guitar.push([t + beat + .05, voices[2], 1.25, beat === 2 ? .43 : .39])
    }
    drums.push([t + 2, DRUM.rim, .25, .29], [t + 4, DRUM.rim, .25, .22])
    for (let s = 0; s < bar; s++) drums.push([t + s, DRUM.shaker, .3, s % 2 ? .24 : .34])
  }
  if (lift || b >= 22) {
    for (const pitch of voices.slice(1)) strings.push([t, pitch, 5.7, lift ? .48 : .40])
  }
})
// Small answering voices occur in the lead's long notes, never continuous doubling.
for (const [b, pitch] of [[4, 71], [6, 69], [8, 71], [20, 66], [22, 71]] as const) {
  flute.push([b * bar + 3, pitch, 1, .52], [b * bar + 4, pitch + 2, 1.6, .48])
}
chimes.push([0, 86, 3, .48], [8, 85, 2.5, .36], [18 * bar, 90, 3, .34])

export default {
  title: 'Windows Warm at Dusk',
  bpm: 90,
  stepsPerBeat: 2,
  beatsPerBar: 3,
  length: harmony.length * bar,
  loopStart: intro * bar,
  room: .46,
  echoBeats: .75,
  echoFeedback: .12,
  parts: [
    { inst: 'ocarina', notes: melody, vol: .64, pan: -.08, reverb: .23, echo: .035 },
    { inst: 'flute', notes: flute, vol: .60, pan: .15, reverb: .28, echo: .03 },
    { inst: 'harp', notes: harp, vol: .51, pan: -.29, reverb: .27 },
    { inst: 'guitar', notes: guitar, vol: .34, pan: .30, reverb: .15 },
    { inst: 'strings', notes: strings, vol: .28, pan: .05, reverb: .35 },
    { inst: 'bass_finger', notes: bass, vol: .54, pan: 0, reverb: .06 },
    { inst: 'drums', notes: drums, vol: .44, pan: .12, reverb: .12 },
    { inst: 'music_box', notes: chimes, vol: .42, pan: -.18, reverb: .40 },
  ],
} satisfies Song
