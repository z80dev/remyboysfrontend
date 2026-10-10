/**
 * Runtime-synthesized sound for Night of the Cabald: SFX built from oscillators and filtered noise, music through the
 * Remy Quest engine (same master glue/limiter). The context starts on the first gesture (autoplay policy).
 */
import { MusicEngine, createMaster } from '../quest/music/engine'
import song from './song'
import { load, save } from './store'

export type Sfx =
  | 'popper'
  | 'boom'
  | 'rush'
  | 'launch'
  | 'explode'
  | 'groan'
  | 'ghost'
  | 'cackle'
  | 'roar'
  | 'hurt'
  | 'pickup'
  | 'weapon'
  | 'bell'
  | 'thunder'
  | 'hit'
  | 'splat'
  | 'fireball'
  | 'empty'
  | 'death'
  | 'rise'

const MUTE_KEY = 'haunt.muted'
let ctx: AudioContext | undefined
let out: GainNode | undefined
let engine: MusicEngine | undefined
let noiseBuf: AudioBuffer | undefined
let wantMusic = false
let muted = load(MUTE_KEY) === '1'

function env(g: GainNode, at: number, vol: number, dur: number, attack = 0.004) {
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(vol, at + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
}

function tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0, vibrato = 0) {
  if (!ctx || !out) return
  const at = ctx.currentTime + delay
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = type
  o.frequency.setValueAtTime(f0, at)
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), at + dur)
  if (vibrato) {
    const lfo = ctx.createOscillator()
    const depth = ctx.createGain()
    lfo.frequency.value = 7
    depth.gain.value = vibrato
    lfo.connect(depth).connect(o.frequency)
    lfo.start(at)
    lfo.stop(at + dur)
  }
  env(g, at, vol, dur)
  o.connect(g).connect(out)
  o.start(at)
  o.stop(at + dur + 0.02)
}

function noise(dur: number, vol: number, type: BiquadFilterType, f0: number, f1 = f0, q = 1, delay = 0, attack = 0.004) {
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
  env(g, at, vol, dur, attack)
  s.connect(filter).connect(g).connect(out)
  s.start(at, Math.random() * 1.5)
  s.stop(at + dur + 0.02)
}

const SFX: Record<Sfx, () => void> = {
  popper: () => {
    tone('square', 900, 180, 0.09, 0.22)
    noise(0.06, 0.35, 'bandpass', 2400, 900, 1.2)
  },
  boom: () => {
    noise(0.38, 0.9, 'lowpass', 2400, 220, 0.7)
    tone('sine', 120, 38, 0.32, 0.9)
  },
  rush: () => {
    noise(0.045, 0.3, 'bandpass', 3200, 1800, 1.5)
    tone('square', 640 + Math.random() * 80, 260, 0.045, 0.1)
  },
  launch: () => {
    noise(0.32, 0.45, 'bandpass', 600, 2400, 2)
    tone('triangle', 180, 520, 0.25, 0.3)
  },
  explode: () => {
    noise(1.1, 1.1, 'lowpass', 1400, 70, 0.8)
    tone('sine', 80, 26, 0.8, 1)
  },
  groan: () => {
    const f = 80 + Math.random() * 40
    tone('sawtooth', f, f * 0.7, 0.8, 0.13, 0, 5)
    noise(0.7, 0.08, 'bandpass', 500, 300, 6)
  },
  ghost: () => tone('sine', 420 + Math.random() * 120, 300, 1.1, 0.16, 0, 30),
  cackle: () => {
    for (let i = 0; i < 6; i++) tone('square', i % 2 ? 620 : 860, i % 2 ? 560 : 780, 0.06, 0.08, i * 0.07)
  },
  roar: () => {
    tone('sawtooth', 70, 36, 1.4, 0.4, 0, 8)
    noise(1.2, 0.6, 'lowpass', 500, 120, 1)
  },
  hurt: () => {
    tone('square', 320, 110, 0.2, 0.22)
    noise(0.1, 0.25, 'lowpass', 900, 300)
  },
  pickup: () => {
    for (const [i, f] of [660, 880, 1320].entries()) tone('square', f, f, 0.06, 0.1, i * 0.05)
  },
  weapon: () => {
    for (const [i, f] of [330, 440, 554, 660, 880].entries()) tone('square', f, f, 0.08, 0.12, i * 0.06)
  },
  bell: () => {
    tone('sine', 196, 194, 3, 0.4)
    tone('sine', 196 * 2.76, 196 * 2.7, 2, 0.18)
    tone('sine', 196 * 5.4, 196 * 5.3, 1, 0.08)
  },
  thunder: () => {
    noise(2.8, 0.9, 'lowpass', 420, 50, 0.6, 0, 0.08)
    noise(0.25, 0.5, 'highpass', 2000, 800, 0.5)
  },
  hit: () => noise(0.05, 0.28, 'highpass', 2600, 1200),
  splat: () => {
    noise(0.16, 0.45, 'lowpass', 1600, 200, 2)
    tone('sine', 160, 60, 0.12, 0.3)
  },
  fireball: () => {
    noise(0.45, 0.3, 'bandpass', 1400, 400, 3)
    tone('sawtooth', 300, 140, 0.3, 0.08)
  },
  empty: () => tone('square', 1300, 1200, 0.025, 0.08),
  death: () => {
    tone('sawtooth', 220, 45, 1.4, 0.3, 0, 6)
    noise(1.2, 0.4, 'lowpass', 800, 100)
  },
  rise: () => noise(0.9, 0.3, 'lowpass', 260, 90, 1, 0, 0.2),
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
  toggleMute(): boolean {
    muted = !muted
    save(MUTE_KEY, muted ? '1' : '0')
    if (out && ctx) out.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.05)
    return muted
  },
}
