import type { Song } from '../../kit'
export const winSong: Song = {
  title: 'Lucky Deal', bpm: 120, stepsPerBeat: 4, beatsPerBar: 4, length: 16, loopStart: 16, room: .35,
  parts: [
    { inst: 'bell', vol: .45, notes: [[0,67,1,.55],[1,72,1,.6],[2,76,1,.6],[3,79,1,.65],[4,84,1,.7],[5,88,2,.7],[7,86,1,.55],[8,89,4,.6],[12,88,4,.7]] },
    { inst: 'epiano', vol: .5, notes: [[0,48,4,.5],[8,60,4,.5],[8,65,4,.5],[8,67,4,.5],[12,60,4,.6],[12,64,4,.6],[12,67,4,.6],[12,72,4,.6]] }
  ]
}
