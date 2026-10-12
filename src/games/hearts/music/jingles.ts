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
  title: 'To the Moon', bpm: 120, stepsPerBeat: 4, beatsPerBar: 4, length: 20, loopStart: 20, room: .55,
  parts: [
    { inst: 'brass', vol: .55, notes: [[0,60,2,.6],[2,67,2,.65],[4,72,2,.7],[6,79,2,.75],[8,84,8,.85],[8,76,8,.75],[8,79,8,.75]] },
    { inst: 'timpani', vol: .55, notes: [[6,43,1,.6],[7,43,1,.7],[8,48,8,.9]] },
    { inst: 'orch_hit', vol: .35, notes: [[8,72,2,.7]] }
  ]
}
export const broken: Song = {
  title: 'Hearts Broken', bpm: 120, stepsPerBeat: 4, beatsPerBar: 4, length: 4, loopStart: 4,
  parts: [{ inst: 'epiano', vol: .35, notes: [[0,76,2,.45],[2,72,2,.4]] }]
}
export const rugged: Song = {
  title: 'Rug Lord', bpm: 120, stepsPerBeat: 4, beatsPerBar: 4, length: 5, loopStart: 5,
  parts: [{ inst: 'strings', vol: .35, notes: [[0,40,5,.55],[0,46,5,.55]] }]
}
