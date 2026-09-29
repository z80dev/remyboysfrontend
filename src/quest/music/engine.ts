import { synthesize, type Voice } from './instruments'
import type { Part, Song } from './song'

/** Deterministic, sample-clock sequencing. Intros play once; effect tails cross loop boundaries. */
type Event = { step: number; part: number; midi: number; duration: number; velocity: number }
type Mix = { input: GainNode; dispose(): void }
type Session = {
  song: Song
  events: Event[]
  next: number
  origin: number
  loop: boolean
  done: boolean
  fadeAt: number
  gain: GainNode
  mix: Mix
  parts: GainNode[]
  voices: Voice[]
  resolve?: () => void
}
const LOOKAHEAD = 0.2
const VOICE_CAP = 64
const MASTER_LEVEL = 0.8
const renderTiming = new WeakMap<AudioBuffer, number>()

function ramp(param: AudioParam, at: number, value: number, duration: number): void {
  param.cancelAndHoldAtTime(at)
  param.linearRampToValueAtTime(value, at + Math.max(0.01, duration))
}

/** The same gentle glue/soft ceiling is used by live music, SFX and offline verification. */
export function createMaster(ctx: BaseAudioContext, destination: AudioNode): Mix {
  const input = ctx.createGain()
  input.gain.value = MASTER_LEVEL
  const dc = ctx.createBiquadFilter()
  dc.type = 'highpass'
  dc.frequency.value = 24
  dc.Q.value = 0.5
  const glue = ctx.createDynamicsCompressor()
  glue.threshold.value = -15
  glue.knee.value = 12
  glue.ratio.value = 2.2
  glue.attack.value = 0.012
  glue.release.value = 0.18
  const limiter = ctx.createWaveShaper()
  const curve = new Float32Array(4097)
  for (let i = 0; i < curve.length; i++) curve[i] = 0.84 * Math.tanh(((i / (curve.length - 1)) * 2 - 1) / 0.84)
  limiter.curve = curve
  limiter.oversample = '2x'
  input.connect(dc).connect(glue).connect(limiter).connect(destination)
  return { input, dispose() { input.disconnect(); dc.disconnect(); glue.disconnect(); limiter.disconnect() } }
}

const impulseCache = new WeakMap<BaseAudioContext, Map<number, AudioBuffer>>()
function impulse(ctx: BaseAudioContext, room: number): AudioBuffer {
  const size = Math.round(Math.max(0, Math.min(1, room)) * 10)
  let cache = impulseCache.get(ctx)
  if (!cache) { cache = new Map(); impulseCache.set(ctx, cache) }
  const previous = cache.get(size)
  if (previous) return previous
  const seconds = 0.35 + size * 0.22
  const buffer = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    let seed = 72831 + ch * 1347
    let low = 0
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 16807) % 2147483647
      low = low * 0.55 + (seed / 1073741823.5 - 1) * 0.45
      const t = i / ctx.sampleRate
      data[i] = t < 0.014 ? 0 : low * Math.exp(-6.5 * t / seconds)
    }
  }
  cache.set(size, buffer)
  return buffer
}

function makeSession(ctx: BaseAudioContext, destination: AudioNode, song: Song, at: number, loop: boolean): Session {
  const gain = ctx.createGain()
  const nodes: AudioNode[] = [gain]
  const reverb = ctx.createConvolver()
  reverb.buffer = impulse(ctx, song.room ?? 0.45)
  const wet = ctx.createGain()
  wet.gain.value = 0.45
  reverb.connect(wet).connect(gain)
  const delay = ctx.createDelay(4)
  delay.delayTime.value = Math.min(4, (song.echoBeats ?? 0.75) * 60 / song.bpm)
  const feedback = ctx.createGain()
  feedback.gain.value = Math.max(0, Math.min(0.8, song.echoFeedback ?? 0.24))
  const damp = ctx.createBiquadFilter()
  damp.type = 'lowpass'
  damp.frequency.value = 3800
  delay.connect(damp).connect(feedback).connect(delay)
  damp.connect(gain)
  nodes.push(reverb, wet, delay, feedback, damp)
  const parts = song.parts.map((part: Part) => {
    const input = ctx.createGain()
    input.gain.value = part.vol ?? 0.7
    const pan = ctx.createStereoPanner()
    pan.pan.value = Math.max(-1, Math.min(1, part.pan ?? 0))
    const roomSend = ctx.createGain()
    roomSend.gain.value = part.reverb ?? (part.inst.startsWith('bass') || part.inst === 'drums' ? 0.08 : 0.24)
    const echoSend = ctx.createGain()
    echoSend.gain.value = part.echo ?? 0
    input.connect(pan).connect(gain)
    pan.connect(roomSend).connect(reverb)
    pan.connect(echoSend).connect(delay)
    nodes.push(input, pan, roomSend, echoSend)
    return input
  })
  gain.connect(destination)
  const events: Event[] = []
  song.parts.forEach((part, index) => {
    for (const [step, midi, length, velocity = 0.8] of part.notes) {
      if (step < 0 || step >= song.length || length <= 0 || velocity <= 0) continue
      events.push({ step, part: index, midi: midi + (part.transpose ?? 0), duration: length, velocity })
    }
  })
  events.sort((a, b) => a.step - b.step)
  return {
    song, events, next: 0, origin: at, loop, done: !events.length, fadeAt: Number.POSITIVE_INFINITY,
    gain, parts, voices: [], mix: { input: gain, dispose() { for (const node of nodes) node.disconnect() } },
  }
}

function schedule(ctx: BaseAudioContext, session: Session, until: number, now: number): void {
  const { song, events } = session
  const stepSeconds = 60 / song.bpm / song.stepsPerBeat
  const loopSteps = song.length - song.loopStart
  if (session.done) return
  while (true) {
    if (session.next === events.length) {
      if (!session.loop || loopSteps <= 0) { session.done = true; break }
      session.origin += loopSteps * stepSeconds
      session.next = events.findIndex((event) => event.step >= song.loopStart)
      if (session.next < 0) { session.done = true; break }
    }
    const event = events[session.next]
    const swing = Math.floor(event.step) % 2 ? (song.swing ?? 0) : 0
    const at = session.origin + (event.step + swing) * stepSeconds
    if (at >= until || at >= session.fadeAt) break
    session.next++
    if (at < now - 0.025) continue // A stalled foreground skips missed notes, never emits a catch-up burst.
    session.voices = session.voices.filter((voice) => voice.end > at)
    if (session.voices.length >= VOICE_CAP) session.voices.shift()?.stop(at)
    const part = song.parts[event.part]
    session.voices.push(synthesize(ctx, session.parts[event.part], part.inst, event.midi,
      Math.max(now, at), event.duration * stepSeconds, event.velocity))
  }
}

function dispose(session: Session): void {
  for (const voice of session.voices) voice.dispose()
  session.mix.dispose()
  session.resolve?.()
}

/** An engine owns only its music buses. The caller owns context unlock/mute/visibility policy. */
export class MusicEngine {
  private sessions: Session[] = []
  private timer: ReturnType<typeof setInterval> | undefined
  private active: Session | undefined
  private music: GainNode
  private duckUntil = 0

  constructor(private ctx: AudioContext, private destination: AudioNode) {
    this.music = ctx.createGain()
    this.music.connect(destination)
  }

  play(song: Song): void {
    if (this.active?.song === song && this.active.fadeAt === Number.POSITIVE_INFINITY) return
    const now = this.ctx.currentTime
    this.stop(400)
    const session = makeSession(this.ctx, this.music, song, now + 0.025, true)
    session.gain.gain.setValueAtTime(0, now)
    session.gain.gain.linearRampToValueAtTime(1, now + 0.4)
    this.active = session
    this.sessions.push(session)
    this.start()
  }

  stop(fadeMs = 250): void {
    const now = this.ctx.currentTime
    for (const session of this.sessions) {
      if (!session.loop || session.fadeAt !== Number.POSITIVE_INFINITY) continue
      session.fadeAt = now + Math.max(0.01, fadeMs / 1000)
      ramp(session.gain.gain, now, 0, fadeMs / 1000)
    }
    this.active = undefined
  }

  /** Fanfare overlays do not move the song clock; overlapping fanfares share one duck envelope. */
  playOnce(song: Song): Promise<void> {
    const now = this.ctx.currentTime
    const session = makeSession(this.ctx, this.destination, song, now + 0.025, false)
    const stepSeconds = 60 / song.bpm / song.stepsPerBeat
    const finalStep = Math.max(song.length, ...song.parts.flatMap((part) => part.notes.map((n) => n[0] + n[2])))
    session.fadeAt = now + finalStep * stepSeconds + 0.8
    session.gain.gain.setValueAtTime(1, session.fadeAt - 0.12)
    session.gain.gain.linearRampToValueAtTime(0, session.fadeAt)
    this.duckUntil = Math.max(this.duckUntil, session.fadeAt)
    const duck = this.music.gain
    ramp(duck, now, 0.22, 0.045)
    duck.setValueAtTime(0.22, this.duckUntil)
    duck.linearRampToValueAtTime(1, this.duckUntil + 0.25)
    this.sessions.push(session)
    this.start()
    return new Promise((resolve) => { session.resolve = resolve })
  }

  private start(): void {
    this.tick()
    if (this.timer === undefined) this.timer = setInterval(() => this.tick(), 25)
  }

  private tick(): void {
    const now = this.ctx.currentTime
    this.sessions = this.sessions.filter((session) => {
      if (now >= session.fadeAt) { dispose(session); return false }
      schedule(this.ctx, session, now + LOOKAHEAD, now)
      return true
    })
    if (!this.sessions.length && this.timer !== undefined) { clearInterval(this.timer); this.timer = undefined }
  }

  dispose(): void {
    clearInterval(this.timer)
    this.timer = undefined
    for (const session of this.sessions) dispose(session)
    this.sessions = []
    this.active = undefined
    this.music.disconnect()
  }
}

/** Render through precisely the live mix. loop:false is useful for instrument tails/fanfares. */
export async function renderOffline(song: Song, seconds: number,
  opts: { sampleRate?: number; loop?: boolean } = {}): Promise<AudioBuffer> {
  const sampleRate = opts.sampleRate ?? 44100
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate)
  const master = createMaster(ctx, ctx.destination)
  const session = makeSession(ctx, master.input, song, 0, opts.loop ?? true)
  // Bound the offline graph too: scheduling a whole score up front leaves thousands
  // of future filters connected, which is needlessly expensive on mobile browsers.
  let until = Math.min(seconds, 2)
  schedule(ctx, session, until, 0)
  let suspended = until < seconds ? ctx.suspend(until) : undefined
  const rendering = ctx.startRendering()
  while (suspended) {
    await suspended
    until = Math.min(seconds, until + 2)
    schedule(ctx, session, until, ctx.currentTime)
    suspended = until < seconds ? ctx.suspend(until) : undefined
    await ctx.resume()
  }
  const buffer = await rendering
  dispose(session)
  master.dispose()
  renderTiming.set(buffer, song.beatsPerBar * 60 / song.bpm)
  return buffer
}

export type Measurement = { rms: number; peak: number; dc: number }
/** Stereo aggregate RMS, absolute peak/DC and per-bar levels (last partial bar is included). */
export function measure(buffer: AudioBuffer, barSeconds = renderTiming.get(buffer) ?? 2): Measurement & {
  bars: Measurement[]
} {
  const barFrames = Math.max(1, Math.round(barSeconds * buffer.sampleRate))
  const bars: Measurement[] = []
  let totalSquare = 0
  let totalSum = 0
  let peak = 0
  for (let start = 0; start < buffer.length; start += barFrames) {
    const end = Math.min(buffer.length, start + barFrames)
    let square = 0
    let sum = 0
    let barPeak = 0
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch)
      for (let i = start; i < end; i++) {
        const value = data[i]
        square += value * value
        sum += value
        barPeak = Math.max(barPeak, Math.abs(value))
      }
    }
    const count = (end - start) * buffer.numberOfChannels
    bars.push({ rms: Math.sqrt(square / count), peak: barPeak, dc: sum / count })
    totalSquare += square
    totalSum += sum
    peak = Math.max(peak, barPeak)
  }
  const count = buffer.length * buffer.numberOfChannels
  return { rms: Math.sqrt(totalSquare / count), peak, dc: totalSum / count, bars }
}
