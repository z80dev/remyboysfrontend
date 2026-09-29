/**
 * Song data format — CONTRACT between the music engine (engine.ts) and the composers (songs/*.ts).
 * Songs are plain data (TS modules may compute arrays with helpers). Everything is synthesized at runtime; no samples.
 *
 * Timing: `step` = one grid step; `stepsPerBeat` steps per quarter note (4 → 16ths, 3 → triplet-8ths feel, 6 → 16th triplets).
 * A bar is `beatsPerBar * stepsPerBeat` steps. Absolute step index from the song start is used everywhere.
 * Playback: steps [0, loopStart) play once (intro), then [loopStart, length) loops forever seamlessly.
 * Notes may ring past the loop end; the engine lets tails overlap into the next iteration (reverb too).
 */

/** Melodic/harmonic instruments the engine implements (GBA "Direct Sound"-era palette, richer than 8-bit). */
export type Instrument =
  // leads
  | 'square' // pulse lead, 25% duty, gentle delayed vibrato (classic GB/GBA)
  | 'square50' // 50% pulse, hollow
  | 'saw_lead' // filtered saw lead, bright, vibrato (GBA synth-brass lead)
  | 'flute' // sine + breath noise, soft attack, vibrato
  | 'ocarina' // near-sine, rounder, gentle vibrato
  | 'trumpet' // brass solo: saw through envelope-driven lowpass, slight pitch scoop
  | 'violin' // bowed: detuned saws, slow-ish attack, expressive vibrato
  | 'whistle' // pure sine, fast vibrato
  // keys / plucks / mallets
  | 'epiano' // FM electric piano (Rhodes-ish), velocity-sensitive brightness
  | 'piano' // bright FM/additive acoustic-ish piano, decaying
  | 'harp' // plucked, bright, long decay
  | 'guitar' // plucked (Karplus-Strong-ish) nylon/clean guitar
  | 'marimba' // woody mallet
  | 'bell' // FM bell / glockenspiel, sparkly
  | 'music_box' // tiny high bell, short
  | 'organ' // drawbar organ
  | 'accordion' // reedy
  // pads / sections
  | 'strings' // ensemble strings: detuned saws, slow attack, lush (chords welcome)
  | 'strings_stacc' // short string section stabs
  | 'brass' // brass section: bright stabs/pads, filter swell
  | 'choir' // "aah" formant pad
  | 'pad' // warm synth pad
  | 'orch_hit' // orchestra hit stab (use sparingly)
  // bass
  | 'bass' // synth bass (square+sub), punchy
  | 'bass_finger' // round electric bass
  | 'bass_slap' // slap/funk bass
  | 'bass_saw' // aggressive saw bass (boss/battle)
  | 'tuba' // oompah low brass
  | 'timpani' // pitched orchestral drum (use the note's midi pitch)
  // drums: pitch field selects the sound (GM-like numbers below)
  | 'drums'

/** GM-style drum map for `inst: 'drums'`. */
export const DRUM = {
  kick: 36,
  rim: 37,
  snare: 38,
  clap: 39,
  snare2: 40,
  tomLow: 41,
  hatClosed: 42,
  tomMid: 45,
  hatPedal: 44,
  hatOpen: 46,
  tomHigh: 48,
  crash: 49,
  ride: 51,
  tambourine: 54,
  cowbell: 56,
  shaker: 70,
  conga: 63,
  bongo: 60,
  woodblock: 76,
  timpaniRoll: 47,
} as const

/** [step, midi, lengthInSteps, velocity 0..1 (default 0.8)] */
export type Note = [step: number, midi: number, len: number, vel?: number]

export interface Part {
  inst: Instrument
  notes: Note[]
  /** 0..1, default 0.7 — mix balance within the song. */
  vol?: number
  /** -1..1 stereo pan. */
  pan?: number
  /** 0..1 send to the song reverb (default per instrument). */
  reverb?: number
  /** 0..1 send to the tempo-synced echo. */
  echo?: number
  /** Semitones added to every note (handy for reusing phrases). */
  transpose?: number
}

export interface Song {
  title: string
  bpm: number
  stepsPerBeat: number
  beatsPerBar: number
  /** Total length in steps (loop end). */
  length: number
  /** Loop start in steps (0 = loop everything). */
  loopStart: number
  /** Swing 0..0.5: delays every off-step by this fraction of a step. */
  swing?: number
  /** Room size 0..1 for the song reverb (0.3 small room, 0.8 hall). */
  room?: number
  /** Echo time in beats (e.g. 0.75 = dotted 8th) and feedback 0..0.8. */
  echoBeats?: number
  echoFeedback?: number
  parts: Part[]
}
