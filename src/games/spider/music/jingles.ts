import type { Song } from '../../kit'

export const winJingle: Song = {
  title: 'Eight Legs Home', bpm: 140, stepsPerBeat: 4, beatsPerBar: 4, length: 24, loopStart: 24, room: .45,
  parts: [
    { inst: 'marimba', vol: .55, notes: [[0,69,1,.6],[1,72,1,.6],[2,76,1,.6],[3,81,1,.65],[4,80,1,.6],[5,76,1,.6],[6,73,1,.65],[7,76,1,.7]] },
    { inst: 'strings_stacc', vol: .45, notes: [[8,57,2,.7],[8,61,2,.7],[8,64,2,.7],[12,57,2,.75],[12,61,2,.75],[12,64,2,.75],[12,69,2,.75]] },
    { inst: 'bell', vol: .4, notes: [[16,81,2,.55],[17,85,2,.6],[18,88,2,.65],[20,93,4,.7]] },
    { inst: 'strings', vol: .35, notes: [[16,57,8,.5],[16,61,8,.5],[16,64,8,.5]] }
  ]
}
export const runJingle: Song = {
  title: 'Thirteen Steps Home', bpm: 150, stepsPerBeat: 8, beatsPerBar: 4, length: 20, loopStart: 20, room: .3,
  parts: [{ inst: 'bell', vol: .35, notes: [74,76,78,79,81,83,85,86,88,90,91,93,95].map((midi, step) => [step, midi, step === 12 ? 6 : 2, .35 + step / 12 * .25]) }]
}
