import { createMaster, MusicEngine } from './music/engine'
import type { Song } from './music/song'
import { loadSong } from './music/songs'
import type { Jingle, Sfx, Track } from './types'

const sfxLast = new Map<Sfx, number>()
let context: AudioContext | undefined
let master: GainNode | undefined
let engine: MusicEngine | undefined
let desired: Track | null = null
let current: Track | null = null
let muted = localStorage.getItem('remyquest.muted') === 'true'
let request = 0

function midiHz(midi: number): number { return 440 * 2 ** ((midi - 69) / 12) }
function pulseWave(ctx: BaseAudioContext, duty: number): PeriodicWave {
  const real = new Float32Array(32)
  const imag = new Float32Array(32)
  for (let n = 1; n < real.length; n++) imag[n] = 2 / (Math.PI * n) * Math.sin(Math.PI * n * duty)
  return ctx.createPeriodicWave(real, imag, { disableNormalization: false })
}
const waveCache = new WeakMap<BaseAudioContext, Map<number, PeriodicWave>>()
function wave(ctx: BaseAudioContext, duty: number): PeriodicWave {
  let cache = waveCache.get(ctx)
  if (!cache) { cache = new Map(); waveCache.set(ctx, cache) }
  let result = cache.get(duty)
  if (!result) { result = pulseWave(ctx, duty); cache.set(duty, result) }
  return result
}
function tone(ctx: BaseAudioContext, out: AudioNode, at: number, midi: number, dur: number, level: number, duty = 0.25): void {
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.setPeriodicWave(wave(ctx, duty)); osc.frequency.setValueAtTime(midiHz(midi), at)
  amp.gain.setValueAtTime(0.0001, at); amp.gain.linearRampToValueAtTime(level, at + 0.008)
  amp.gain.setValueAtTime(level * 0.72, at + Math.max(0.01, dur * 0.55)); amp.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(amp); amp.connect(out); osc.start(at); osc.stop(at + dur + 0.01)
  osc.onended = () => { osc.disconnect(); amp.disconnect() }
}
function ensureContext(): void {
  if (context) return
  context = new AudioContext()
  master = createMaster(context, context.destination).input
  master.gain.value = muted ? 0 : 0.8
  engine = new MusicEngine(context, master)
  document.addEventListener('visibilitychange', () => {
    if (!context) return
    if (document.hidden) void context.suspend()
    else void context.resume()
  })
}

async function startTrack(track: Track): Promise<void> {
  if (!context || !engine || muted || desired !== track || current === track) return
  const token = ++request
  const song = await loadSong(track)
  if (token !== request || muted || desired !== track) return
  engine.play(song)
  current = track
}
function sfxTone(ctx: BaseAudioContext, destination: AudioNode, name: Sfx, at: number, rateLimit = true, cleanupMs = 0): void {
  if (rateLimit && name === 'text' && at - (sfxLast.get(name) ?? Number.NEGATIVE_INFINITY) < 0.055) return
  if (rateLimit) sfxLast.set(name, at)
  const output = ctx.createGain(); output.gain.value = 2; output.connect(destination)
  const one = (offset: number, midi: number, dur: number, lvl = 0.18, duty = 0.25) => tone(ctx, output, at + offset, midi, dur, lvl, duty)
  switch (name) {
    case 'cursor': one(0, 84, .035, .09, .125); break
    case 'select': one(0, 76, .07, .19); one(.065, 88, .11, .16); break
    case 'back': one(0, 74, .09, .15); one(.07, 65, .12, .11); break
    case 'bump': one(0, 45, .11, .2, .5); break
    case 'door': one(0, 64, .08, .11); one(.09, 72, .12, .16); one(.2, 79, .16, .14); break
    case 'step': one(0, 45, .025, .025, .5); break
    case 'text': one(0, 79, .018, .026, .125); break
    case 'hit': one(0, 48, .13, .25, .5); break
    case 'hitWeak': one(0, 61, .07, .10); break
    case 'hitSuper': one(0, 52, .08, .24); one(.045, 76, .12, .2); break
    case 'crit': one(0, 84, .08, .23); one(.055, 96, .16, .17); break
    case 'faint': one(0, 79, .14, .17); one(.12, 67, .17, .14); one(.27, 55, .24, .13); break
    case 'throw': one(0, 88, .08, .08); one(.07, 76, .13, .16); break
    case 'shake': one(0, 72, .025, .11, .125); one(.055, 75, .025, .11, .125); break
    case 'catchFail': one(0, 72, .08, .14); one(.08, 67, .09, .16); one(.17, 62, .18, .17); break
    case 'escape': one(0, 83, .06, .09); one(.06, 91, .07, .1); one(.13, 100, .18, .12); break
    case 'statUp': for (let i = 0; i < 5; i++) one(i * .045, 60 + i * 3, .12, .1); break
    case 'statDown': for (let i = 0; i < 5; i++) one(i * .045, 72 - i * 3, .12, .1); break
    case 'heal': one(0, 72, .12, .16); one(.11, 79, .12, .16); one(.22, 84, .22, .18); break
    case 'alert': one(0, 72, .11, .16); one(.11, 89, .25, .19); break
    case 'encounter': one(0, 48, .12, .22); one(.1, 60, .12, .2); one(.2, 72, .1, .18); one(.3, 84, .2, .17); break
    case 'ledge': one(0, 55, .06, .12); one(.07, 79, .1, .12); break
    case 'save': one(0, 60, .08, .12); one(.1, 67, .08, .12); one(.2, 72, .16, .15); break
    case 'money': one(0, 84, .04, .15); one(.05, 91, .05, .14); one(.11, 96, .16, .17); break
    case 'error': one(0, 53, .16, .18, .5); one(.17, 49, .2, .15, .5); break
  }
  if (cleanupMs > 0) window.setTimeout(() => output.disconnect(), cleanupMs)
}
/** Original short cadences, orchestrated rather than octave-stacked pulse arpeggios. */
function fanfare(name: Jingle): Song {
  const phrases: Record<Jingle, number[]> = {
    heal: [74, 78, 81, 78, 83, 81, 86],
    catch: [69, 74, 78, 76, 81, 86],
    levelup: [74, 78, 81, 83, 81, 86],
    item: [81, 78, 74, 76, 81],
    badge: [62, 69, 74, 78, 76, 81, 86],
  }
  const melody = phrases[name]
  const end = melody.length * 2
  const festive = name === 'badge' || name === 'catch' || name === 'levelup'
  return {
    title: name, bpm: name === 'heal' ? 112 : 132, stepsPerBeat: 4, beatsPerBar: 4,
    length: end + 8, loopStart: 0, room: 0.55,
    parts: [
      { inst: festive ? 'trumpet' : 'bell', vol: 0.65, reverb: 0.32,
        notes: melody.map((midi, i) => [i * 2, midi, i === melody.length - 1 ? 8 : 1.7, 0.76 + (i % 3) * 0.05]) },
      { inst: 'strings', vol: 0.35, pan: -0.18, notes: [
        [0, 62, end - 4, 0.6], [0, 66, end - 4, 0.58], [0, 69, end - 4, 0.57],
        [end - 4, 61, 4, 0.68], [end - 4, 67, 4, 0.64], [end - 4, 69, 4, 0.65],
        [end, 62, 7, 0.73], [end, 66, 7, 0.7], [end, 69, 7, 0.69],
      ] },
      { inst: 'harp', vol: 0.4, pan: 0.25, notes: [[end, 74, 6, 0.8], [end + 1, 78, 5, 0.7], [end + 2, 81, 4, 0.65]] },
      { inst: festive ? 'timpani' : 'bass_finger', vol: 0.4, notes: [[0, 38, 4, 0.8], [end - 4, 45, 3, 0.7], [end, 38, 6, 0.85]] },
    ],
  }
}

const fanfares: Record<Jingle, Song> = {
  heal: fanfare('heal'), catch: fanfare('catch'), levelup: fanfare('levelup'),
  item: fanfare('item'), badge: fanfare('badge'),
}

export const audio = {
  unlock(): void {
    ensureContext()
    if (!document.hidden) void context?.resume()
    if (desired && !muted) void startTrack(desired)
  },
  play(track: Track): void {
    desired = track
    if (muted || !context) return
    if (!document.hidden) void context.resume()
    void startTrack(track)
  },
  stop(fadeMs = 250): void {
    desired = null
    current = null
    request++
    engine?.stop(fadeMs)
  },
  get current(): Track | null { return current ?? desired },
  sfx(name: Sfx): void { if (context && master && !muted) sfxTone(context, master, name, context.currentTime, true, 1200) },
  jingle(name: Jingle): Promise<void> {
    return !muted && engine ? engine.playOnce(fanfares[name]) : Promise.resolve()
  },
  cry(seed: number, pitch = 1): void {
    if (!context || !master || muted) return
    const x = Math.abs(Math.floor(seed)) % 4490
    const p = Math.max(.35, Math.min(2.5, pitch))
    const now = context.currentTime
    const out = context.createGain(); out.gain.value = .75; out.connect(master)
    const base = 48 + (x % 25)
    const steps = 8
    for (let i = 0; i < steps; i++) {
      const t = now + i * .052 / p
      const semitone = ((x >> (i % 12)) % 9) - 4
      const freq = midiHz(base + semitone) * p
      const osc = context.createOscillator()
      const amp = context.createGain()
      osc.type = i % 3 === 0 ? 'triangle' : 'square'
      osc.frequency.setValueAtTime(freq * (i % 2 ? 1.04 : .96), t); osc.frequency.linearRampToValueAtTime(freq, t + .045 / p)
      amp.gain.setValueAtTime(.0001, t); amp.gain.linearRampToValueAtTime(.12, t + .009 / p); amp.gain.exponentialRampToValueAtTime(.0001, t + .052 / p)
      osc.connect(amp); amp.connect(out); osc.start(t); osc.stop(t + .06 / p)
      osc.onended = () => { osc.disconnect(); amp.disconnect() }
    }
    window.setTimeout(() => out.disconnect(), 800 / p)
  },
  get muted(): boolean { return muted },
  setMuted(value: boolean): void {
    muted = value; localStorage.setItem('remyquest.muted', String(value))
    if (master && context) {
      master.gain.cancelAndHoldAtTime(context.currentTime)
      master.gain.setTargetAtTime(value ? 0 : 0.8, context.currentTime, 0.02)
    }
    if (value) { request++; engine?.stop(40); current = null }
    else if (desired && context) {
      if (!document.hidden) void context.resume()
      void startTrack(desired)
    }
  },
}

