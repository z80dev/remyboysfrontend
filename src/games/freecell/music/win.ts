import type { Song } from '../../kit'

/** Original Royal Flourish, composed and reviewed by CardsArtDirector; 24 sixth-beat steps = 2.5 seconds. */
export const winSong: Song = {
  title: 'Royal Flourish', bpm: 96, stepsPerBeat: 6, beatsPerBar: 4, length: 24, loopStart: 24, room: 0.5,
  parts: [
    { inst: 'brass', vol: 0.55, notes: [[0,65,2,.6],[2,65,2,.6],[4,65,2,.65],[6,70,6,.8],[12,74,3,.75],[15,72,3,.7],
      [18,70,6,.85],[18,74,6,.8],[18,77,6,.8],[18,82,6,.85]] },
    { inst: 'timpani', vol: 0.6, notes: [[0,41,2,.55],[6,46,3,.8],[12,41,3,.6],[15,41,3,.6],[18,46,6,.9]] }
  ]
}
