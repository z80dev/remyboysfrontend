import { renderOffline } from '../../quest/music/engine'
import type { Note, Song } from '../../quest/music/song'

/**
 * Synth tracks as finite recordings. A Song loops forever, so a track is "planned" first: intro + enough loops for
 * ~2½ minutes + an 8 s fade (or a single pass with its reverb tail for one-shots). The plan is then rendered in
 * fixed 8 s segments through the engine's own offline mix (`renderOffline`), each with a few seconds of pre-roll so
 * reverb/echo/compressor state matches a continuous render; neighbours overlap by a few ms and are crossfaded.
 * Any segment renders in well under a second, so playback (and seeking anywhere) starts fast while the rest of the
 * track renders in the background. Rendered audio is kept as 16-bit PCM (~10.6 MB/min) in a byte-bounded LRU.
 */

export const SAMPLE_RATE = 44100
export const CHANNELS = 2
/** Segment length in frames (8 s). */
export const SEGMENT_FRAMES = 8 * SAMPLE_RATE
/** Crossfade between neighbouring segments in frames (~12 ms); every segment but the last carries this tail. */
export const OVERLAP = 512
const PREROLL = 4
const MAX_PREROLL = 16
const RELEASE = 1
const FADE = 8
const TARGET = 150
const BUDGET = 96 * 1024 * 1024
/** renderOffline schedules notes in 2 s chunks between suspends. */
const SCHEDULE_FRAMES = 2 * SAMPLE_RATE
const QUANTUM = 128

type Hit = { time: number; frame: number; end: number; part: number; midi: number; length: number; velocity: number }

export type Plan = {
  song: Song
  stepSeconds: number
  /** Seconds of the finished recording. */
  duration: number
  frames: number
  segments: number
  /** Final fade-out (seconds): starts at `fadeAt`, silent at `duration`. */
  fadeAt: number
  /** Every note of the recording on an absolute clock (swing applied, quantized to frames), sorted by time. */
  hits: Hit[]
}

/** One-shots (loopStart >= length) play once with their tail; loops get intro + ~2½ min of loops + an 8 s fade. */
export function plan(song: Song): Plan {
  const stepSeconds = 60 / song.bpm / song.stepsPerBeat
  const loopSteps = song.length - song.loopStart
  const oneShot = loopSteps <= 0
  const swing = song.swing ?? 0
  const at = (step: number) => (step + (Math.floor(step) % 2 ? swing : 0)) * stepSeconds
  const hits: Hit[] = []
  const push = (part: number, [step, midi, length, velocity = 0.8]: Note, offset: number) => {
    const frame = Math.round((at(step) + offset) * SAMPLE_RATE)
    const time = frame / SAMPLE_RATE
    hits.push({ time, frame, end: time + length * stepSeconds + RELEASE, part, midi, length, velocity })
  }
  let duration: number
  let fadeAt: number
  if (oneShot) {
    song.parts.forEach((part, index) => {
      for (const note of part.notes) if (note[0] >= 0 && note[0] < song.length && note[2] > 0) push(index, note, 0)
    })
    const last = hits.reduce((end, hit) => Math.max(end, hit.end - RELEASE), song.length * stepSeconds)
    const room = Math.round(Math.max(0, Math.min(1, song.room ?? 0.45)) * 10)
    duration = last + 0.35 + room * 0.22 + 0.6
    fadeAt = duration - 0.4
  } else {
    const intro = song.loopStart * stepSeconds
    const loop = loopSteps * stepSeconds
    const loops = Math.max(1, Math.round((TARGET - intro) / loop))
    fadeAt = intro + loops * loop
    duration = fadeAt + FADE
    const passes = loops + Math.ceil(FADE / loop)
    song.parts.forEach((part, index) => {
      for (const note of part.notes) {
        const [step, , length] = note
        if (step < 0 || step >= song.length || length <= 0) continue
        if (step < song.loopStart) push(index, note, 0)
        else for (let pass = 0; pass < passes; pass++) push(index, note, pass * loop)
      }
    })
  }
  const kept = hits.filter((hit) => hit.time < duration && hit.velocity > 0).sort((a, b) => a.time - b.time)
  const frames = Math.ceil(duration * SAMPLE_RATE)
  return {
    song,
    stepSeconds,
    duration: frames / SAMPLE_RATE,
    frames,
    segments: Math.ceil(frames / SEGMENT_FRAMES),
    fadeAt,
    hits: kept,
  }
}

/** Interleaved 16-bit stereo for global frames [index * SEGMENT_FRAMES, + segment + OVERLAP tail). */
export async function renderSegment(plan: Plan, index: number): Promise<Int16Array> {
  const first = index * SEGMENT_FRAMES
  const last = Math.min(plan.frames, first + SEGMENT_FRAMES + OVERLAP)
  const start = first / SAMPLE_RATE
  // Pre-roll far enough back that reverb/echo/compressor state has settled and notes still sounding have started.
  let from = Math.max(0, start - PREROLL)
  for (const hit of plan.hits) {
    if (hit.time >= from) break
    if (hit.end > from) from = Math.min(from, hit.time)
  }
  // Every segment must render each note identically so neighbours line up. Chrome evaluates note starts per
  // 128-frame render quantum, so the render origin stays on a global multiple of 128 frames; notes sit half a frame
  // past their frame (immune to float rounding); and the origin is nudged back (into silence before the song if need
  // be) until no note lands where renderOffline suspends to schedule, which could delay it by a quantum.
  const base = Math.floor((Math.max(from, start - MAX_PREROLL) * SAMPLE_RATE) / QUANTUM) * QUANTUM
  let origin = base
  for (let attempt = 0; attempt < 200; attempt++) {
    origin = base - attempt * QUANTUM
    const clash = plan.hits.some((hit) => {
      const frame = hit.frame - origin
      const phase = frame % SCHEDULE_FRAMES
      return hit.frame >= origin && hit.frame < last && frame > 256 && (phase <= 256 || phase >= SCHEDULE_FRAMES - 128)
    })
    if (!clash) break
  }
  const notes: Note[][] = plan.song.parts.map(() => [])
  const frameSteps = 1 / SAMPLE_RATE / plan.stepSeconds
  for (const hit of plan.hits) {
    if (hit.frame >= last) break
    if (hit.frame >= origin)
      notes[hit.part].push([(hit.frame - origin + 0.5) * frameSteps, hit.midi, hit.length, hit.velocity])
  }
  const song: Song = {
    ...plan.song,
    swing: 0,
    loopStart: 0,
    length: Math.ceil((last - origin) * frameSteps) + 1,
    parts: plan.song.parts.map((part, index) => ({ ...part, notes: notes[index] })),
  }
  const buffer = await renderOffline(song, (last - origin) / SAMPLE_RATE, { sampleRate: SAMPLE_RATE, loop: false })
  const frames = last - first
  const out = new Int16Array(frames * CHANNELS)
  const fadeFrom = plan.fadeAt * SAMPLE_RATE
  const fadeFrames = plan.frames - fadeFrom
  for (let ch = 0; ch < CHANNELS; ch++) {
    const data = buffer.getChannelData(Math.min(ch, buffer.numberOfChannels - 1))
    const skip = first - origin
    for (let i = 0; i < frames; i++) {
      const frame = first + i
      const gain = frame < fadeFrom ? 1 : 0.5 + 0.5 * Math.cos((Math.PI * (frame - fadeFrom)) / fadeFrames)
      const value = (data[skip + i] ?? 0) * gain
      out[i * CHANNELS + ch] = Math.max(-32768, Math.min(32767, Math.round(value * 32767)))
    }
  }
  return out
}

/** Builds a playable buffer from a cached segment; `fadeIn` crossfades from the previous segment's tail. */
export function toAudioBuffer(ctx: BaseAudioContext, pcm: Int16Array, fadeIn: boolean, fadeOut: boolean): AudioBuffer {
  const frames = pcm.length / CHANNELS
  const buffer = ctx.createBuffer(CHANNELS, frames, SAMPLE_RATE)
  for (let ch = 0; ch < CHANNELS; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < frames; i++) data[i] = pcm[i * CHANNELS + ch] / 32768
    if (fadeIn) for (let i = 0; i < Math.min(OVERLAP, frames); i++) data[i] *= i / OVERLAP
    if (fadeOut && frames > OVERLAP) for (let i = 0; i < OVERLAP; i++) data[frames - OVERLAP + i] *= 1 - i / OVERLAP
  }
  return buffer
}

type Entry = {
  plan: Plan
  segments: (Int16Array | undefined)[]
  waiting: Map<
    number,
    { promise: Promise<Int16Array>; resolve: (pcm: Int16Array) => void; reject: (e: unknown) => void }
  >
}

/**
 * Segment renderer + byte-bounded LRU of rendered tracks. One background render at a time fills the focused track
 * from the playhead to the end and wraps, then pre-renders the opening segment of the track that plays next.
 * Requested segments (latest request first) never wait behind background work: they get a second render slot.
 * The focused and pre-rendered tracks are never evicted.
 */
export class SegmentCache {
  private entries = new Map<string, Entry>()
  private bytes = 0
  private urgent: { id: string; index: number }[] = []
  private focused?: { id: string; from: number }
  private upcoming?: string
  /** `${id}#${index}` of renders in progress. */
  private inflight = new Set<string>()
  private epoch = 0

  /** Last render times (ms), for diagnostics. */
  timings: number[] = []

  private entry(id: string, plan: Plan): Entry {
    let entry = this.entries.get(id)
    if (entry?.plan !== plan) {
      if (entry) this.drop(id)
      entry = { plan, segments: new Array(plan.segments).fill(undefined), waiting: new Map() }
    }
    this.entries.delete(id)
    this.entries.set(id, entry)
    return entry
  }

  peek(id: string, index: number): Int16Array | undefined {
    return this.entries.get(id)?.segments[index]
  }

  /** Resolves with the segment, rendering it ahead of background work if needed. */
  segment(id: string, plan: Plan, index: number): Promise<Int16Array> {
    const entry = this.entry(id, plan)
    const cached = entry.segments[index]
    if (cached) return Promise.resolve(cached)
    let wait = entry.waiting.get(index)
    if (!wait) {
      let resolve!: (pcm: Int16Array) => void
      let reject!: (e: unknown) => void
      const promise = new Promise<Int16Array>((ok, fail) => {
        resolve = ok
        reject = fail
      })
      wait = { promise, resolve, reject }
      entry.waiting.set(index, wait)
    }
    this.urgent.push({ id, index })
    this.run()
    return wait.promise
  }

  /** Background-render `id` from segment `from` onward; afterwards pre-render the first segment of `next`. */
  focus(id: string, plan: Plan, from: number, next?: { id: string; plan: Plan }): void {
    if (next && next.id !== id) {
      this.entry(next.id, next.plan)
      this.upcoming = next.id
    } else this.upcoming = undefined
    this.entry(id, plan)
    this.focused = { id, from }
    this.run()
  }

  clear(): void {
    this.epoch++
    for (const id of [...this.entries.keys()]) this.drop(id)
    this.urgent = []
    this.focused = undefined
    this.upcoming = undefined
  }

  private drop(id: string): void {
    const entry = this.entries.get(id)
    if (!entry) return
    for (const pcm of entry.segments) if (pcm) this.bytes -= pcm.byteLength
    for (const wait of entry.waiting.values()) wait.reject(new Error('Rendering cancelled'))
    this.entries.delete(id)
  }

  private nextJob(): { id: string; index: number } | undefined {
    const open = (id: string, index: number) =>
      this.entries.has(id) && !this.entries.get(id)?.segments[index] && !this.inflight.has(`${id}#${index}`)
    while (this.urgent.length) {
      const job = this.urgent.pop() as { id: string; index: number }
      if (open(job.id, job.index)) return job
    }
    const focus = this.focused && this.entries.get(this.focused.id)
    if (this.focused && focus) {
      const count = focus.segments.length
      const from = Math.max(0, Math.min(count - 1, this.focused.from))
      for (let i = 0; i < count; i++) {
        if (open(this.focused.id, (from + i) % count)) return { id: this.focused.id, index: (from + i) % count }
      }
    }
    if (this.upcoming && open(this.upcoming, 0)) return { id: this.upcoming, index: 0 }
    return undefined
  }

  private run(): void {
    while (this.inflight.size < (this.urgent.length ? 2 : 1)) {
      const job = this.nextJob()
      if (!job) return
      void this.render(job.id, job.index)
    }
  }

  private async render(id: string, index: number): Promise<void> {
    const entry = this.entries.get(id) as Entry
    const key = `${id}#${index}`
    const epoch = this.epoch
    const started = performance.now()
    this.inflight.add(key)
    try {
      const pcm = await renderSegment(entry.plan, index)
      this.timings = [...this.timings.slice(-31), performance.now() - started]
      if (epoch === this.epoch && this.entries.get(id) === entry) {
        entry.segments[index] = pcm
        this.bytes += pcm.byteLength
        entry.waiting.get(index)?.resolve(pcm)
        entry.waiting.delete(index)
        this.evict()
      }
    } catch (error) {
      entry.waiting.get(index)?.reject(error)
      entry.waiting.delete(index)
      if (this.focused?.id === id) this.focused = undefined
    } finally {
      this.inflight.delete(key)
      this.run()
    }
  }

  private evict(): void {
    for (const id of this.entries.keys()) {
      if (this.bytes <= BUDGET) return
      if (id !== this.focused?.id && id !== this.upcoming) this.drop(id)
    }
  }

  /** Bytes of rendered PCM held (diagnostics). */
  get size(): number {
    return this.bytes
  }
}
