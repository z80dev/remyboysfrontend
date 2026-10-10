import type { EqPreset } from './types'

/**
 * Winamp 2.x built-in EQ presets (winamp.q1). Values are the library's 1..64 slider positions (33 = 0 dB,
 * order: preamp, then 60 Hz … 16 kHz), converted to dB on the ±12 dB scale.
 */
const RAW: [name: string, preamp: number, bands: number[]][] = [
  ['Classical', 33, [33, 33, 33, 33, 33, 33, 20, 20, 20, 16]],
  ['Club', 33, [33, 33, 38, 42, 42, 42, 38, 33, 33, 33]],
  ['Dance', 33, [48, 44, 36, 32, 32, 22, 20, 20, 32, 32]],
  ['Laptop speakers/headphones', 33, [40, 50, 41, 26, 28, 35, 40, 48, 53, 56]],
  ['Large hall', 33, [49, 49, 42, 42, 33, 24, 24, 24, 33, 33]],
  ['Party', 33, [44, 44, 33, 33, 33, 33, 33, 33, 44, 44]],
  ['Pop', 33, [29, 40, 44, 45, 41, 30, 28, 28, 29, 29]],
  ['Reggae', 33, [33, 33, 31, 22, 33, 43, 43, 33, 33, 33]],
  ['Rock', 33, [45, 40, 23, 19, 26, 39, 47, 50, 50, 50]],
  ['Soft', 33, [40, 35, 30, 28, 30, 39, 46, 48, 50, 52]],
  ['Ska', 33, [28, 24, 25, 31, 39, 42, 47, 48, 50, 48]],
  ['Full Bass', 33, [48, 48, 48, 42, 35, 25, 18, 15, 14, 14]],
  ['Soft Rock', 33, [39, 39, 36, 31, 25, 23, 26, 31, 37, 47]],
  ['Full Treble', 33, [16, 16, 16, 25, 37, 50, 58, 58, 58, 60]],
  ['Full Bass & Treble', 33, [44, 42, 33, 20, 24, 35, 46, 50, 52, 52]],
  ['Live', 33, [24, 33, 39, 41, 42, 42, 39, 37, 37, 36]],
  ['Techno', 33, [45, 42, 33, 23, 24, 33, 45, 48, 48, 47]],
]

function db(value: number): number {
  return Math.round(Math.max(-12, Math.min(12, ((value - 33) * 12) / 31)) * 10) / 10
}

export const PRESETS: readonly EqPreset[] = RAW.map(([name, preamp, bands]) => ({
  name,
  preamp: db(preamp),
  bands: bands.map(db),
}))
