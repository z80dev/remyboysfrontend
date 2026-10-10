/**
 * Shared sound for classic games: one lazily-created AudioContext (behind the Remy Quest master glue/limiter), a
 * single persisted mute for every game, oscillator/noise SFX helpers and a bridge to the Remy Quest music engine.
 *
 * The context is created by {@link unlockAudio} (call it from a user gesture: autoplay policy). Until then, and
 * while muted, hidden or suspended, SFX helpers are silent no-ops, so game code can call them unconditionally.
 */
import { useSyncExternalStore } from 'react'
import { MusicEngine, createMaster } from '../../quest/music/engine'
import type { Song } from '../../quest/music/song'
import { gameKey, loadGame, saveGame } from './storage'

/** The shared audio graph: `out` is the master input every sound (and the music engine) connects to. */
export interface GamesAudio {
  /** The one AudioContext all games share. */
  ctx: AudioContext
  /** Master gain feeding the compressor + soft limiter; 0 while muted. Connect custom nodes here. */
  out: GainNode
  /** Two seconds of looping white noise, shared by {@link noise}. */
  noise: AudioBuffer
}

const MUTE_ID = 'muted'
const MASTER_LEVEL = 0.8

let audio: GamesAudio | undefined
let jingles: MusicEngine | undefined
let current: MusicVoice | undefined
let jingleDucks = 0
let wanted: Song | undefined
let muted = loadGame(MUTE_ID, false, (v): v is boolean => typeof v === 'boolean')
const listeners = new Set<() => void>()
const duty = new Map<number, PeriodicWave>()

function applyMute(): void {
  if (audio) audio.out.gain.setTargetAtTime(muted ? 0 : MASTER_LEVEL, audio.ctx.currentTime, 0.03)
  syncMusic()
}

function emit(): void {
  for (const l of listeners) l()
}

if (typeof window !== 'undefined') {
  // Another tab (or window) toggled mute.
  window.addEventListener('storage', (e) => {
    if (e.key !== gameKey(MUTE_ID)) return
    muted = loadGame(MUTE_ID, false, (v): v is boolean => typeof v === 'boolean')
    applyMute()
    emit()
  })
}

/** One looping song with its own engine; `bus` is what the crossfade ramps (the engine's own fade-in is a fixed 0.4 s). */
interface MusicVoice {
  song: Song
  engine: MusicEngine
  bus: GainNode
}

const ENGINE_FADE_IN = 0.4
const retiring = new Map<MusicVoice, number>()
let musicBus: GainNode | undefined

/** Common bus for the looping songs, so owned jingles can duck them without touching a crossfade's own ramps. */
function musicOut(a: GamesAudio): GainNode {
  if (!musicBus) {
    musicBus = a.ctx.createGain()
    musicBus.connect(a.out)
  }
  return musicBus
}

function release(v: MusicVoice): void {
  clearTimeout(retiring.get(v))
  retiring.delete(v)
  v.engine.dispose()
  v.bus.disconnect()
}

/** Fade a song out over `fadeMs`, then tear its engine down. */
function retire(v: MusicVoice, fadeMs: number): void {
  v.engine.stop(fadeMs)
  retiring.set(v, window.setTimeout(() => release(v), Math.max(0, fadeMs) + 120))
}

/**
 * Make the audio graph match `wanted` + the mute state. Muted: no music node exists (the current engine is stopped,
 * the wanted song stays queued). Otherwise start `wanted` when it is not already the playing song, crossfading from
 * the previous one over `fadeMs`: the old engine fades out via `engine.stop(fadeMs)`; the new engine (whose own
 * fade-in is a fixed 0.4 s linear ramp) goes through a bus gain held at `0.4 / fade` for 0.4 s and then ramped
 * linearly to 1 at `fade`, so the product is one exactly linear `fadeMs` fade-in.
 */
function syncMusic(fadeMs = 400): void {
  if (muted) {
    for (const v of [...retiring.keys()]) release(v)
    if (current) {
      retire(current, 80)
      current = undefined
    }
    return
  }
  if (!audio || !wanted || current?.song === wanted) return
  const { ctx } = audio
  const fade = Math.max(0, fadeMs) / 1000
  const now = ctx.currentTime
  const bus = ctx.createGain()
  bus.connect(musicOut(audio))
  if (fade > ENGINE_FADE_IN) {
    const hold = ENGINE_FADE_IN / fade
    bus.gain.setValueAtTime(hold, now)
    bus.gain.setValueAtTime(hold, now + ENGINE_FADE_IN)
    bus.gain.linearRampToValueAtTime(1, now + fade)
  }
  const engine = new MusicEngine(ctx, bus)
  engine.play(wanted)
  if (current) retire(current, fadeMs)
  current = { song: wanted, engine, bus }
}

const voices = new Map<string, Set<() => void>>()

/** Register a stopper for owner cleanup; returns the unregister function for the voice's `onended`. */
function track(owner: string | undefined, kill: () => void): () => void {
  const key = owner ?? ''
  let set = voices.get(key)
  if (!set) voices.set(key, (set = new Set()))
  set.add(kill)
  return () => {
    const s = voices.get(key)
    if (!s) return
    s.delete(kill)
    if (!s.size) voices.delete(key)
  }
}

/**
 * Cut off SFX (and jingles started with an `owner`) that are still sounding or scheduled, with a ~20-30 ms release
 * (no click). Looping music and unowned jingles are untouched (use {@link stopMusic}). Typical use: `stopSounds('pinball')`
 * in a game's unmount cleanup, for sounds created with `owner: 'pinball'`.
 * @param owner only voices created with this `owner`; omit to stop every SFX voice, owned or not.
 */
export function stopSounds(owner?: string): void {
  const keys = owner === undefined ? [...voices.keys()] : [owner]
  for (const key of keys) {
    const set = voices.get(key)
    if (!set) continue
    voices.delete(key)
    for (const kill of set) kill()
  }
}

/**
 * Create the shared AudioContext on first call and resume it. Also runs automatically on the first pointerdown /
 * keydown / touchend anywhere on the page, so calling it is optional; call it explicitly from a game's own start
 * handler to be certain. Later calls just resume. Starts any music requested earlier with {@link playMusic}.
 * @returns the shared graph, or `undefined` when Web Audio is unavailable.
 */
export function unlockAudio(): GamesAudio | undefined {
  if (!audio) {
    if (typeof AudioContext === 'undefined') return undefined
    const ctx = new AudioContext()
    const out = createMaster(ctx, ctx.destination).input
    out.gain.value = muted ? 0 : MASTER_LEVEL
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    audio = { ctx, out, noise }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) void ctx.suspend()
      else {
        void ctx.resume()
        syncMusic()
      }
    })
  }
  if (!document.hidden) void audio.ctx.resume()
  syncMusic()
  return audio
}

if (typeof document !== 'undefined') {
  // Autoplay policy: a context may only start inside a user gesture. Hook the first real gestures page-wide (capture,
  // so stopPropagation in a game cannot hide them) so games never have to remember to call unlockAudio before sound.
  const gestures = ['pointerdown', 'keydown', 'touchend'] as const
  const stop = () => {
    for (const g of gestures) document.removeEventListener(g, onGesture, true)
  }
  const onGesture = () => {
    const a = unlockAudio()
    if (!a) return stop()
    // Keep listening until the context really runs (a key like Ctrl is not an activation gesture in every browser).
    void a.ctx.resume().then(() => {
      if (a.ctx.state === 'running') stop()
    })
  }
  for (const g of gestures) document.addEventListener(g, onGesture, true)
}

/** The shared graph if {@link unlockAudio} has created it, regardless of mute/suspension (for custom node graphs). */
export function getGamesAudio(): GamesAudio | undefined {
  return audio
}

/** Whether every game's sound is muted (persisted at `remygames.muted.v1`). */
export function isGamesMuted(): boolean {
  return muted
}

/** Set and persist the global mute; fades the master gain and notifies {@link useGamesMuted} subscribers. */
export function setGamesMuted(next: boolean): void {
  if (next === muted) return
  muted = next
  saveGame(MUTE_ID, muted)
  applyMute()
  emit()
}

/** Flip the global mute. @returns the new muted state. */
export function toggleGamesMuted(): boolean {
  setGamesMuted(!muted)
  return muted
}

/**
 * React binding for the global mute.
 * @returns `muted` plus the stable `setMuted` / `toggleMuted` actions (same functions as {@link setGamesMuted} and
 * {@link toggleGamesMuted}).
 */
export function useGamesMuted(): { muted: boolean; setMuted: (muted: boolean) => void; toggleMuted: () => boolean } {
  const value = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => void listeners.delete(cb)
    },
    () => muted,
    () => false,
  )
  return { muted: value, setMuted: setGamesMuted, toggleMuted: toggleGamesMuted }
}

/** The graph only when sound would actually be audible now (unlocked, not muted, context running). */
function live(): GamesAudio | undefined {
  return audio && !muted && audio.ctx.state === 'running' ? audio : undefined
}

/** MIDI note number to Hz (69 = A4 = 440 Hz). */
export function midiHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

/**
 * Click-free envelope on any AudioParam (normally a GainNode's `gain`): exponential attack to `peak`, then an
 * exponential decay to silence at `at + dur`.
 * @param param the gain parameter to automate.
 * @param at AudioContext time the envelope starts (seconds).
 * @param peak level reached after `attack`.
 * @param dur total length in seconds.
 * @param attack attack time in seconds (default 4 ms).
 */
export function envelope(param: AudioParam, at: number, peak: number, dur: number, attack = 0.004): void {
  param.setValueAtTime(0.0001, at)
  param.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + Math.min(attack, dur / 2))
  param.exponentialRampToValueAtTime(0.0001, at + dur)
}

/** Options shared by {@link tone}, {@link sweep}, {@link chord} and {@link sequence}. */
export interface ToneOptions {
  /** Waveform; default `'square'`. */
  type?: OscillatorType
  /** Pulse width 0–1 (e.g. 0.125, 0.25, 0.5 for Game Boy-style pulses). Overrides `type`. */
  duty?: number
  /** Peak gain, default 0.2. */
  vol?: number
  /** Seconds from now before the sound starts, default 0. */
  delay?: number
  /** Attack seconds, default 0.004. */
  attack?: number
  /** Vibrato depth in Hz (7 Hz LFO), default off. */
  vibrato?: number
  /** Exponential glide target in Hz reached at the end of the note ({@link sweep} sets this). */
  to?: number
  /**
   * FM: modulator frequency as a multiple of the carrier's (the modulator tracks a `to` glide). Used together with
   * `fmDepth`; default 1.
   */
  fmRatio?: number
  /**
   * FM: sine modulator depth in Hz (peak carrier deviation). FM is active when this is > 0; the carrier then
   * defaults to `'sine'` unless `type` / `duty` is set.
   */
  fmDepth?: number
  /** Cleanup tag: {@link stopSounds}(`owner`) cuts this note off. Passed through by {@link sweep}, {@link chord}, {@link sequence}. */
  owner?: string
}

function pulse(a: GamesAudio, d: number): PeriodicWave {
  const key = Math.round(Math.min(0.95, Math.max(0.05, d)) * 1000)
  let w = duty.get(key)
  if (!w) {
    const real = new Float32Array(32)
    const imag = new Float32Array(32)
    for (let n = 1; n < real.length; n++) imag[n] = (2 / (Math.PI * n)) * Math.sin(Math.PI * n * (key / 1000))
    w = a.ctx.createPeriodicWave(real, imag)
    duty.set(key, w)
  }
  return w
}

/**
 * One oscillator note through an envelope into the master.
 * @param freq frequency in Hz.
 * @param dur duration in seconds.
 */
export function tone(freq: number, dur: number, opts: ToneOptions = {}): void {
  const a = live()
  if (!a) return
  const { ctx, out } = a
  const at = ctx.currentTime + (opts.delay ?? 0)
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  const fm = (opts.fmDepth ?? 0) > 0
  if (opts.duty !== undefined) osc.setPeriodicWave(pulse(a, opts.duty))
  else osc.type = opts.type ?? (fm ? 'sine' : 'square')
  osc.frequency.setValueAtTime(freq, at)
  if (opts.to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), at + dur)
  let lfo: OscillatorNode | undefined
  let depth: GainNode | undefined
  if (opts.vibrato) {
    lfo = ctx.createOscillator()
    depth = ctx.createGain()
    lfo.frequency.value = 7
    depth.gain.value = opts.vibrato
    lfo.connect(depth).connect(osc.frequency)
    lfo.start(at)
    lfo.stop(at + dur + 0.02)
  }
  let mod: OscillatorNode | undefined
  let modDepth: GainNode | undefined
  if (fm) {
    const ratio = opts.fmRatio ?? 1
    mod = ctx.createOscillator()
    modDepth = ctx.createGain()
    mod.type = 'sine'
    mod.frequency.setValueAtTime(freq * ratio, at)
    if (opts.to !== undefined) mod.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to * ratio), at + dur)
    modDepth.gain.value = opts.fmDepth ?? 0
    mod.connect(modDepth).connect(osc.frequency)
    mod.start(at)
    mod.stop(at + dur + 0.02)
  }
  envelope(g.gain, at, opts.vol ?? 0.2, dur, opts.attack)
  osc.connect(g).connect(out)
  osc.start(at)
  osc.stop(at + dur + 0.02)
  const untrack = track(opts.owner, () => {
    const t = ctx.currentTime
    g.gain.cancelScheduledValues(t)
    g.gain.setValueAtTime(g.gain.value, t)
    g.gain.linearRampToValueAtTime(0, t + 0.02)
    osc.stop(t + 0.03)
    lfo?.stop(t + 0.03)
    mod?.stop(t + 0.03)
  })
  osc.onended = () => {
    untrack()
    osc.disconnect()
    g.disconnect()
    depth?.disconnect()
    lfo?.disconnect()
    mod?.disconnect()
    modDepth?.disconnect()
  }
}

/** A {@link tone} that glides exponentially from `from` to `to` Hz over `dur` seconds (zaps, falls, risers). */
export function sweep(from: number, to: number, dur: number, opts: ToneOptions = {}): void {
  tone(from, dur, { ...opts, to })
}

/** Options for {@link noise}. */
export interface NoiseOptions {
  /** Filter type, default `'bandpass'`. */
  filter?: BiquadFilterType
  /** Filter frequency in Hz at the start, default 1200. */
  freq?: number
  /** Filter frequency the cutoff glides to by the end (defaults to `freq`). */
  to?: number
  /** Filter Q, default 1. */
  q?: number
  /** Peak gain, default 0.3. */
  vol?: number
  /** Seconds from now before it starts, default 0. */
  delay?: number
  /** Attack seconds, default 0.004. */
  attack?: number
  /** Cleanup tag: {@link stopSounds}(`owner`) cuts this burst off. */
  owner?: string
}

/** Filtered white-noise burst (hits, explosions, wind, hi-hats). @param dur duration in seconds. */
export function noise(dur: number, opts: NoiseOptions = {}): void {
  const a = live()
  if (!a) return
  const { ctx, out } = a
  const at = ctx.currentTime + (opts.delay ?? 0)
  const src = ctx.createBufferSource()
  src.buffer = a.noise
  src.loop = true
  const f = ctx.createBiquadFilter()
  f.type = opts.filter ?? 'bandpass'
  f.Q.value = opts.q ?? 1
  const f0 = opts.freq ?? 1200
  f.frequency.setValueAtTime(f0, at)
  if (opts.to !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), at + dur)
  const g = ctx.createGain()
  envelope(g.gain, at, opts.vol ?? 0.3, dur, opts.attack)
  src.connect(f).connect(g).connect(out)
  src.start(at, Math.random() * 1.5)
  src.stop(at + dur + 0.02)
  const untrack = track(opts.owner, () => {
    const t = ctx.currentTime
    g.gain.cancelScheduledValues(t)
    g.gain.setValueAtTime(g.gain.value, t)
    g.gain.linearRampToValueAtTime(0, t + 0.02)
    src.stop(t + 0.03)
  })
  src.onended = () => {
    untrack()
    src.disconnect()
    f.disconnect()
    g.disconnect()
  }
}

/** Options for {@link chord}. */
export interface ChordOptions extends ToneOptions {
  /** Seconds between successive notes (arpeggiated strum), default 0 (all together). */
  strum?: number
}

/**
 * Play several notes at once (or strummed). `vol` is the total level, split across the notes.
 * @param midis MIDI note numbers (69 = A4).
 * @param dur each note's duration in seconds.
 */
export function chord(midis: readonly number[], dur: number, opts: ChordOptions = {}): void {
  const vol = (opts.vol ?? 0.2) / Math.sqrt(Math.max(1, midis.length))
  midis.forEach((m, i) => tone(midiHz(m), dur, { ...opts, vol, delay: (opts.delay ?? 0) + i * (opts.strum ?? 0) }))
}

/** One step of a {@link sequence}: `[pitch, beats]`, where pitch is a MIDI note, an array of MIDI notes (chord) or `null` (rest). */
export type SequenceNote = readonly [pitch: number | readonly number[] | null, beats: number]

/** Options for {@link sequence}. */
export interface SequenceOptions extends ToneOptions {
  /** Tempo in beats per minute, default 120. */
  bpm?: number
  /** Fraction of each note's length that sounds, default 0.9 (the rest is a small gap). */
  gate?: number
}

/**
 * Schedule a melody on the audio clock (jingles, game-over stings).
 * @param notes `[pitch, beats]` steps played back to back.
 * @returns total length in seconds (0 while sound is not audible), handy for scheduling follow-ups.
 */
export function sequence(notes: readonly SequenceNote[], opts: SequenceOptions = {}): number {
  if (!live()) return 0
  const beat = 60 / (opts.bpm ?? 120)
  const gate = opts.gate ?? 0.9
  let t = opts.delay ?? 0
  for (const [pitch, beats] of notes) {
    const len = beats * beat
    if (pitch !== null) {
      const o = { ...opts, delay: t }
      if (typeof pitch === 'number') tone(midiHz(pitch), len * gate, o)
      else chord(pitch, len * gate, o)
    }
    t += len
  }
  return t - (opts.delay ?? 0)
}

/**
 * Loop a Remy Quest `Song`, crossfaded from whatever is playing. Safe before {@link unlockAudio}: the song starts
 * on unlock. While muted no audio node is created: the song is only queued, the current one is stopped on mute and
 * the queued song starts again (with a default fade) on unmute. Calling it again with the song already playing is a no-op.
 * @param fadeMs crossfade length in ms, default 400: the old song fades out and the new one fades in linearly over
 * exactly this long. The Quest engine's own fade-in is 0.4 s, so a fade-in below 400 ms is still 400 ms.
 */
export function playMusic(song: Song, fadeMs = 400): void {
  wanted = song
  syncMusic(fadeMs)
}

/** Stop the current song with a fade and forget the queued one. @param fadeMs fade-out in milliseconds, default 400. */
export function stopMusic(fadeMs = 400): void {
  wanted = undefined
  if (!current) return
  retire(current, fadeMs)
  current = undefined
}

/**
 * Play a Song once as an overlay that ducks the looping music (win/lose fanfare).
 * @param owner when given, the jingle can be cancelled with {@link stopSounds}(`owner`) (its promise then resolves).
 * An owned jingle runs on its own private engine, because the Quest engine cannot cancel a single overlay; it ducks
 * the looping music to 0.22 for its length through a shared music bus, like the unowned jingle does.
 * @returns resolves when the jingle ends or is cancelled (immediately if audio is not unlocked or muted).
 */
export function playJingle(song: Song, owner?: string): Promise<void> {
  const a = live()
  if (!a) return Promise.resolve()
  if (owner === undefined) return (current?.engine ?? (jingles ??= new MusicEngine(a.ctx, a.out))).playOnce(song)
  const { ctx, out } = a
  const bus = ctx.createGain()
  bus.connect(out)
  const engine = new MusicEngine(ctx, bus)
  const duck = musicOut(a).gain
  const now = ctx.currentTime
  duck.cancelScheduledValues(now)
  duck.setValueAtTime(duck.value, now)
  duck.linearRampToValueAtTime(0.22, now + 0.045)
  jingleDucks++
  let done = false
  let untrack = () => {}
  const finish = () => {
    if (done) return
    done = true
    untrack()
    engine.dispose()
    bus.disconnect()
    if (--jingleDucks > 0) return
    const t = ctx.currentTime
    duck.cancelScheduledValues(t)
    duck.setValueAtTime(duck.value, t)
    duck.linearRampToValueAtTime(1, t + 0.25)
  }
  untrack = track(owner, () => {
    const t = ctx.currentTime
    bus.gain.cancelScheduledValues(t)
    bus.gain.setValueAtTime(bus.gain.value, t)
    bus.gain.linearRampToValueAtTime(0, t + 0.03)
    window.setTimeout(finish, 60)
  })
  return engine.playOnce(song).then(finish)
}
