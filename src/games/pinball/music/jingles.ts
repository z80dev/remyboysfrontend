import type { Note, Song } from '../../kit'

function sting(title: string, length: number, parts: Song['parts']): Song {
  return { title, bpm: 160, stepsPerBeat: 4, beatsPerBar: 4, length, loopStart: 0, room: 0.4, parts }
}

export const missionStart = sting('Mission Accepted', 16, [
  { inst: 'orch_hit', vol: 0.23, notes: [[0, 50, 4, 0.7], [0, 57, 4, 0.6], [0, 62, 4, 0.6]] },
  { inst: 'saw_lead', vol: 0.27, notes: [[2, 74, 2, 0.7], [4, 77, 2, 0.7], [6, 81, 3, 0.75], [10, 86, 5, 0.8]] },
])

export const promotion = sting('Promotion', 22, [
  { inst: 'brass', vol: 0.26, notes: [[0, 62, 3, 0.7], [4, 66, 3, 0.7], [8, 69, 3, 0.75], [12, 74, 10, 0.8]] },
  { inst: 'brass', vol: 0.16, notes: [[12, 62, 10, 0.7], [12, 66, 10, 0.7], [12, 69, 10, 0.7]] },
  { inst: 'drums', vol: 0.16, notes: [[0, 47, 2, 0.6], [4, 47, 2, 0.6], [8, 47, 2, 0.6], [12, 49, 8, 0.55]] },
])

const bells: Note[] = [[0, 86, 3, 0.7], [4, 90, 3, 0.7], [8, 93, 6, 0.8]]
export const extraBall = sting('Extra Ball', 16, [{ inst: 'bell', vol: 0.27, notes: bells }])
export const missionComplete = sting('Mission Completed', 20, [
  { inst: 'saw_lead', vol: 0.22, notes: [[0, 74, 2, 0.7], [2, 78, 2, 0.7], [4, 81, 4, 0.75], [8, 86, 10, 0.8]] },
  { inst: 'strings', vol: 0.14, notes: [[8, 62, 10, 0.6], [8, 66, 10, 0.6], [8, 69, 10, 0.6]] },
])
