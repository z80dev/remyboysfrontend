import type { Song } from '../../kit'

export const won: Song = {
  title: 'I Love You', bpm: 100, stepsPerBeat: 4, beatsPerBar: 4, length: 16, loopStart: 16, room: .5,
  parts: [
    { inst: 'epiano', vol: .55, notes: [[0,72,2,.6],[2,77,2,.65],[4,76,4,.6],[8,74,2,.6],[10,79,2,.65],[12,77,4,.7]] },
    { inst: 'strings', vol: .35, notes: [[0,53,8,.45],[0,57,8,.45],[0,60,8,.45],[8,58,4,.45],[8,62,4,.45],[8,65,4,.45],
      [12,53,4,.5],[12,57,4,.5],[12,60,4,.5],[12,65,4,.5]] },
    { inst: 'harp', vol: .4, notes: [[12,65,1,.5],[13,69,1,.5],[14,72,1,.55],[15,77,2,.6]] }
  ]
}
export const lost: Song = {
  title: 'Plausible Deniability', bpm: 110, stepsPerBeat: 4, beatsPerBar: 4, length: 16, loopStart: 16, room: .4,
  parts: [
    { inst: 'strings', vol: .4, notes: [[0,53,6,.45],[0,56,6,.45],[0,60,6,.45],[6,48,6,.45],[6,52,6,.45],[6,55,6,.45]] },
    { inst: 'epiano', vol: .45, notes: [[0,68,3,.5],[3,67,3,.45]] },
    { inst: 'whistle', vol: .3, notes: [[11,79,1,.45],[12,76,3,.4]] }
  ]
}
export const moon: Song = {
  title: 'To the Moon', bpm: 96, stepsPerBeat: 4, beatsPerBar: 4, length: 16, loopStart: 16, room: .4,
  parts: [{ inst: 'brass', vol: .45, notes: [[0,60,2,.5],[2,64,2,.55],[4,67,4,.6],[8,72,4,.65],[12,76,4,.6],[12,79,4,.55]] }]
}
export const broken: Song = {
  title: 'Hearts Broken', bpm: 120, stepsPerBeat: 4, beatsPerBar: 4, length: 4, loopStart: 4,
  parts: [{ inst: 'epiano', vol: .35, notes: [[0,76,2,.45],[2,72,2,.4]] }]
}
export const rugged: Song = {
  title: 'Rug Lord', bpm: 120, stepsPerBeat: 4, beatsPerBar: 4, length: 4, loopStart: 4,
  parts: [{ inst: 'strings', vol: .35, notes: [[0,36,4,.5],[0,43,4,.35]] }]
}
