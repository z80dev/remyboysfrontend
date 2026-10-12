/**
 * Runtime-synthesized sound for Remy's Harvest: woody plucks and chimes from oscillators and filtered noise, music
 * through the Remy Quest engine. The context starts on the first gesture (autoplay policy, and the X embed).
 */
import { load, save } from '../haunt/store'
import { MusicEngine, createMaster } from '../quest/music/engine'
import song from './song'

export type Sfx = 'golden' | 'gem' | 'sister' | 'sisters' | 'miss' | 'bonk' | 'rotten' | 'level' | 'over' | 'start' | 'drop'

const MUTE_KEY = 'harvest.muted'
/** G major pentatonic, two octaves: each catch in a streak climbs one note. */
const PENTA = [67, 69, 71, 74, 76, 79, 81, 83, 86, 88, 91]
let ctx: AudioContext | undefined
let out: GainNode | undefined
let engine: MusicEngine | undefined
let noiseBuf: AudioBuffer | undefined
let wantMusic = false
let muted = load(MUTE_KEY) === '1'

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12)

function tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0, attack = 0.004) {
  if (!ctx || !out) return
  const at = ctx.currentTime + delay
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(f0, at)
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), at + dur)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(vol, at + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  o.connect(g).connect(out)
  o.start(at)
  o.stop(at + dur + 0.02)
}

function noise(dur: number, vol: number, type: BiquadFilterType, f0: number, f1 = f0, q = 1, delay = 0) {
  if (!ctx || !out || !noiseBuf) return
  const at = ctx.currentTime + delay
  const s = ctx.createBufferSource()
  s.buffer = noiseBuf
  s.loop = true
  const filter = ctx.createBiquadFilter()
  filter.type = type
  filter.Q.value = q
  filter.frequency.setValueAtTime(f0, at)
  filter.frequency.exponentialRampToValueAtTime(Math.max(20, f1), at + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(vol, at + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  s.connect(filter).connect(g).connect(out)
  s.start(at, Math.random() * 1.5)
  s.stop(at + dur + 0.02)
}

/** Marimba-ish wooden pluck: sine fundamental plus a quick 4× overtone. */
function pluck(midi: number, vol: number, delay = 0) {
  const f = hz(midi)
  tone('sine', f, f, 0.32, vol, delay)
  tone('sine', f * 4, f * 4, 0.05, vol * 0.35, delay)
}

function chime(midi: number, vol: number, delay = 0) {
  const f = hz(midi)
  tone('sine', f, f * 0.998, 1.1, vol, delay)
  tone('sine', f * 2.76, f * 2.75, 0.5, vol * 0.3, delay)
}

const SFX: Record<Sfx, () => void> = {
  golden: () => {
    for (const [i, m] of [79, 83, 86, 91, 95].entries()) chime(m, 0.16, i * 0.06)
    noise(0.6, 0.08, 'highpass', 6000, 9000, 0.5)
  },
  gem: () => {
    for (const [i, m] of [84, 88, 91, 96, 100, 103].entries()) chime(m, 0.13, i * 0.045)
  },
  sister: () => tone('triangle', hz(74), hz(76), 0.35, 0.18, 0, 0.03),
  sisters: () => {
    for (const [i, m] of [67, 71, 74, 79].entries()) pluck(m, 0.3, i * 0.08)
    for (const [i, m] of [79, 83, 86].entries()) chime(m + 12, 0.14, 0.35 + i * 0.07)
  },
  miss: () => {
    tone('sine', 140, 60, 0.18, 0.4)
    noise(0.18, 0.25, 'lowpass', 700, 200, 1)
  },
  bonk: () => {
    tone('square', 520, 140, 0.22, 0.16)
    tone('sine', 900, 1500, 0.4, 0.08, 0.05)
    noise(0.12, 0.3, 'bandpass', 1800, 600, 2)
  },
  rotten: () => {
    noise(0.25, 0.35, 'lowpass', 900, 160, 3)
    tone('sawtooth', 180, 90, 0.25, 0.08)
  },
  level: () => {
    for (const [i, m] of [67, 71, 74, 79, 83, 86].entries()) pluck(m, 0.26, i * 0.07)
  },
  over: () => {
    for (const [i, m] of [74, 71, 67, 62].entries()) pluck(m, 0.3, i * 0.16)
  },
  start: () => {
    for (const [i, m] of [74, 79, 83].entries()) pluck(m, 0.28, i * 0.07)
  },
  drop: () => noise(0.06, 0.15, 'bandpass', 1400, 900, 2),
}

export const audio = {
  get muted() {
    return muted
  },
  /** Call from a user gesture. */
  unlock() {
    if (!ctx) {
      ctx = new AudioContext()
      out = createMaster(ctx, ctx.destination).input
      out.gain.value = muted ? 0 : 0.8
      engine = new MusicEngine(ctx, out)
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
      const d = noiseBuf.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) void ctx?.suspend()
        else void ctx?.resume()
      })
    }
    void ctx.resume()
    if (wantMusic) engine?.play(song)
  },
  music(on: boolean) {
    wantMusic = on
    if (on) engine?.play(song)
    else engine?.stop(800)
  },
  sfx(name: Sfx) {
    if (ctx && !muted && ctx.state === 'running') SFX[name]()
  },
  /** A good catch: the streak walks up the pentatonic scale. */
  catch(streak: number) {
    if (!ctx || muted || ctx.state !== 'running') return
    pluck(PENTA[(streak - 1) % PENTA.length], 0.32)
    noise(0.05, 0.12, 'bandpass', 2600, 1600, 2)
  },
  toggleMute(): boolean {
    muted = !muted
    save(MUTE_KEY, muted ? '1' : '0')
    if (out && ctx) out.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.05)
    return muted
  },
}
