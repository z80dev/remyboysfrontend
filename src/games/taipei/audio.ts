import { midiHz, noise, playJingle, sequence, stopSounds, sweep, tone, type Song } from '../kit'
import { strings } from './strings'

const pentatonic = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81]
const owner = 'taipei'
const winJingle: Song = {
  title: strings.win,
  bpm: 168,
  stepsPerBeat: 2,
  beatsPerBar: 4,
  length: 12,
  loopStart: 12,
  parts: [
    { inst: 'harp', vol: 0.28, notes: [[0, 60, 2, 0.6], [1, 64, 2, 0.6], [2, 67, 2, 0.6], [3, 72, 2, 0.6], [5, 76, 3, 0.6], [8, 79, 3, 0.55]] },
    { inst: 'flute', vol: 0.22, notes: [[3, 72, 1, 0.5], [4, 74, 1, 0.5], [5, 76, 1, 0.5], [6, 79, 1, 0.5], [7, 81, 2, 0.5], [9, 84, 2, 0.5]] }
  ]
}
export type Sound = 'select' | 'match' | 'invalid' | 'hint' | 'backup' | 'no-moves' | 'win'
export function createSounds() {
  let last = -Infinity
  return {
    play(kind: Sound, streak = 0) {
      const now = performance.now()
      if (now - last < 40 && kind !== 'win' && kind !== 'no-moves') return
      last = now
      if (kind === 'win') { void playJingle(winJingle, owner); return }
      if (kind === 'select' || kind === 'match') noise(0.015, { filter: 'bandpass', freq: 2200, q: 2, vol: 0.1, owner })
      if (kind === 'match') {
        noise(0.015, { filter: 'bandpass', freq: 2024, q: 2, vol: 0.09, delay: 0.06, owner })
        const frequency = midiHz(pentatonic[streak % pentatonic.length])
        tone(frequency, 0.3, { type: 'sine', vol: 0.12, delay: 0.08, owner })
        tone(frequency * 4, 0.08, { type: 'sine', vol: 0.025, delay: 0.08, owner })
      }
      if (kind === 'invalid') tone(190, 0.025, { type: 'triangle', vol: 0.04, owner })
      if (kind === 'hint') sequence([[79, 0.25], [84, 0.5]], { type: 'sine', vol: 0.09, owner })
      if (kind === 'backup') sweep(500, 120, 0.13, { type: 'sine', vol: 0.08, owner })
      if (kind === 'no-moves') {
        tone(146.8, 0.7, { type: 'triangle', vol: 0.12, owner })
        tone(293.6, 0.12, { type: 'sine', vol: 0.04, owner })
      }
    },
    stop() { stopSounds(owner) }
  }
}
