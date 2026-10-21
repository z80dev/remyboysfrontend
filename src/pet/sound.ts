/** Remygotchi beeps: keychain-pet piezo squares through the shared games mixer (respects the games mute). */
import { midiHz, noise, sequence, sweep, tone } from '../games/kit/sound'

const owner = 'remygotchi'
const beep = { duty: 0.5, vol: 0.12, owner }

export const sfx = {
  click: () => tone(midiHz(88), 0.05, beep),
  pat: () => {
    tone(midiHz(84), 0.06, beep)
    tone(midiHz(91), 0.08, { ...beep, delay: 0.06 })
  },
  chomp: () => {
    for (let i = 0; i < 3; i++) noise(0.06, { freq: 900, q: 2, vol: 0.18, delay: i * 0.16, owner })
    tone(midiHz(76), 0.05, { ...beep, delay: 0.5 })
  },
  happy: () => sequence([[76, 0.5], [79, 0.5], [84, 1]], { ...beep, bpm: 360 }),
  no: () => sequence([[64, 0.5], [60, 1]], { ...beep, bpm: 300, duty: 0.25 }),
  poop: () => sweep(220, 70, 0.28, { ...beep, duty: 0.25, vol: 0.14 }),
  scoop: () => sweep(400, 1400, 0.16, beep),
  bath: () => {
    noise(0.7, { filter: 'highpass', freq: 3000, to: 6000, vol: 0.08, owner })
    for (let i = 0; i < 5; i++) tone(midiHz(84 + ((i * 5) % 9)), 0.04, { ...beep, vol: 0.06, delay: 0.1 + i * 0.12 })
  },
  sleep: () => sequence([[72, 1], [67, 1], [64, 1], [60, 2]], { ...beep, bpm: 220, type: 'triangle', vol: 0.15 }),
  wake: () => sequence([[60, 0.5], [64, 0.5], [67, 0.5], [72, 1]], { ...beep, bpm: 400 }),
  sick: () => sweep(330, 290, 0.4, { ...beep, vibrato: 12 }),
  coin: () => {
    tone(midiHz(88), 0.06, beep)
    tone(midiHz(95), 0.12, { ...beep, delay: 0.07 })
  },
  quest: () => sequence([[79, 0.5], [84, 0.5], [88, 0.5], [91, 1.5]], { ...beep, bpm: 480 }),
  level: () => sequence([[72, 0.5], [76, 0.5], [79, 0.5], [84, 0.5], [79, 0.5], [84, 1.5]], { ...beep, bpm: 420 }),
  streak: () =>
    sequence(
      [[72, 0.5], [72, 0.5], [72, 0.5], [76, 1], [72, 0.5], [76, 0.5], [79, 2], [null, 0.5], [[72, 79, 84], 2]],
      { ...beep, bpm: 360 },
    ),
  lost: () => sequence([[67, 1], [66, 1], [65, 1], [64, 3]], { ...beep, bpm: 200, vibrato: 6 }),
  shuffle: () => noise(0.04, { freq: 2400, q: 4, vol: 0.08, owner }),
  win: () => sequence([[79, 0.5], [83, 0.5], [86, 0.5], [91, 1.5]], { ...beep, bpm: 420 }),
  lose: () => sequence([[67, 0.5], [63, 1.5]], { ...beep, bpm: 300 }),
  hatch: () => {
    for (let i = 0; i < 3; i++) noise(0.05, { freq: 1800, q: 3, vol: 0.2, delay: i * 0.35, owner })
    sequence([[null, 3], [72, 0.5], [76, 0.5], [79, 0.5], [84, 0.5], [88, 2]], { ...beep, bpm: 480 })
  },
}
