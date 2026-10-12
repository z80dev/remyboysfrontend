import type { Song } from '../../kit'

type Note = Song['parts'][number]['notes'][number]

/** Lays out [midi, len] pairs back to back from `start`; midi 0 is a rest. */
export function line(pairs: readonly (readonly [number, number])[], start = 0, vel = 0.8): Note[] {
  const out: Note[] = []
  let step = start
  for (const [midi, len] of pairs) {
    if (midi > 0) out.push([step, midi, len, vel])
    step += len
  }
  return out
}

/** Repeats a one-bar pattern of [offset, midi, len, vel] per bar for `bars` bars. */
export function everyBar(bars: number, barLen: number, make: (bar: number) => Note[]): Note[] {
  const out: Note[] = []
  for (let b = 0; b < bars; b++) for (const [s, m, l, v] of make(b)) out.push([b * barLen + s, m, l, v])
  return out
}

export const MAJ = [0, 4, 7]
export const MIN = [0, 3, 7]

/** Chord tones of `root` + `qual` folded into the octave [low, low + 12) for smooth, voice-led comping. */
export function voiced(root: number, qual: readonly number[], low: number): number[] {
  return qual.map(t => low + (((root + t - low) % 12) + 12) % 12).sort((a, b) => a - b)
}
