import type { Song } from '../../kit'
import { DRUM } from '../../../quest/music/song'
import { canyonChase } from './canyon'
import { clubhouseTheme } from './clubhouse'
import { floorPuzzle } from './floor'

/** Level exit fanfare, about 2.6 s. */
export const winJingle: Song = {
  title: 'Level Complete',
  bpm: 140,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: 24,
  loopStart: 0,
  room: 0.35,
  parts: [
    { inst: 'square', vol: 0.55, notes: [[0, 72, 2, 0.8], [2, 76, 2, 0.8], [4, 79, 2, 0.85], [6, 84, 3, 0.9], [10, 83, 2, 0.7], [12, 84, 10, 0.9]] },
    { inst: 'square50', vol: 0.25, notes: [[12, 76, 10, 0.6], [12, 79, 10, 0.6]] },
    { inst: 'bass_finger', vol: 0.6, notes: [[0, 48, 4, 0.8], [4, 43, 4, 0.7], [8, 47, 4, 0.7], [12, 36, 10, 0.9]] },
    { inst: 'drums', vol: 0.45, notes: [[0, DRUM.kick, 1, 0.8], [6, DRUM.snare, 1, 0.6], [12, DRUM.kick, 1, 0.9], [12, DRUM.crash, 8, 0.5]] }
  ]
}

/** The "bummer": descending trumpet wah-wah, about 2.6 s. */
export const deathJingle: Song = {
  title: 'Bummer',
  bpm: 100,
  stepsPerBeat: 4,
  beatsPerBar: 4,
  length: 17,
  loopStart: 0,
  room: 0.3,
  parts: [
    { inst: 'trumpet', vol: 0.55, notes: [[0, 67, 3, 0.75], [3, 66, 3, 0.7], [6, 65, 3, 0.7], [9, 64, 8, 0.75]] },
    { inst: 'tuba', vol: 0.5, notes: [[0, 43, 3, 0.7], [3, 42, 3, 0.6], [6, 41, 3, 0.6], [9, 40, 8, 0.7]] }
  ]
}

/** Songs alternate by level: level n plays LEVEL_SONGS[(n - 1) % 3]. */
export const LEVEL_SONGS: readonly Song[] = [clubhouseTheme, canyonChase, floorPuzzle]
export const songForLevel = (level: number): Song => LEVEL_SONGS[(level - 1) % LEVEL_SONGS.length]
