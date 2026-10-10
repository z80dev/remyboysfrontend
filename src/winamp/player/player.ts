import { useSyncExternalStore } from 'react'
import type { Song } from '../../quest/music/song'
import { loadLibrary } from './library'
import { PRESETS } from './presets'
import { nameTitle, type Probe, probe } from './probe'
import { CHANNELS, type Plan, plan, SAMPLE_RATE, SEGMENT_FRAMES, SegmentCache, toAudioBuffer } from './synth'
import { EQ_FREQS, type EqState, type Player, type PlayerState, type Track } from './types'

/**
 * The Remyamp audio engine: a module singleton outside React, so playback survives the window unmounting.
 *
 * Graph (built lazily inside the first play gesture):
 *   synth segments / <audio> → input → [preamp → 10 peaking bands]? → balance → volume → analyser → speakers
 * Files and URLs stream through one <audio> element (MediaElementSource); synth songs are rendered in 8 s segments
 * (see synth.ts) and scheduled back to back as AudioBufferSourceNodes. URLs without CORS fall back to a plain
 * <audio> element outside the graph (audible, but no EQ/visualizer).
 */

const STORAGE_KEY = 'remyamp.settings.v1'
const AUDIO_FILE = /\.(mp[123]|mpga|wav|wave|ogg|oga|opus|flac|m4a|aac|mp4|weba|webm|aiff?|caf)$/i
/** Peaking filter Q: about an octave wide, close to Winamp's band shapes. */
const BAND_Q = 1.4
const SMOOTHING = 0.015
/** How far ahead of the playhead synth segments get scheduled (seconds). */
const LOOKAHEAD = 10

type Settings = Pick<PlayerState, 'volume' | 'balance' | 'shuffle' | 'repeat' | 'eq'>

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback
}

function readSettings(): Settings {
  let saved: Partial<Settings> = {}
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') ?? {}
  } catch {}
  const eq: Partial<EqState> = saved.eq ?? {}
  return {
    volume: clamp(saved.volume, 0, 100, 75),
    balance: clamp(saved.balance, -100, 100, 0),
    shuffle: saved.shuffle === true,
    repeat: saved.repeat === true,
    eq: {
      on: eq.on === true,
      auto: eq.auto === true,
      preamp: clamp(eq.preamp, -12, 12, 0),
      bands: EQ_FREQS.map((_, i) => clamp(eq.bands?.[i], -12, 12, 0)),
    },
  }
}

let state: PlayerState = { tracks: [], current: -1, status: 'stopped', loading: false, duration: 0, ...readSettings() }
const listeners = new Set<() => void>()

function set(patch: Partial<PlayerState>): void {
  const previous = state
  state = { ...state, ...patch }
  if ('volume' in patch || 'balance' in patch || 'shuffle' in patch || 'repeat' in patch || 'eq' in patch) {
    const { volume, balance, shuffle, repeat, eq } = state
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume, balance, shuffle, repeat, eq }))
    } catch {}
  }
  if (previous.status !== state.status && 'mediaSession' in navigator) {
    navigator.mediaSession.playbackState = state.status === 'stopped' ? 'none' : state.status
  }
  for (const listener of listeners) listener()
}

// ── Audio graph ─────────────────────────────────────────────────────────────────────────────────────────────────

type Graph = {
  ctx: AudioContext
  input: GainNode
  preamp: GainNode
  bands: BiquadFilterNode[]
  balance: StereoPannerNode
  volume: GainNode
  analyser: AnalyserNode
  media: HTMLAudioElement
}

let graph: Graph | undefined
/** Plain element for URLs that refuse CORS (a MediaElementSource would output silence for them). */
let direct: HTMLAudioElement | undefined

function smooth(param: AudioParam, value: number): void {
  if (graph) param.setTargetAtTime(value, graph.ctx.currentTime, SMOOTHING)
}

function applyEq(g: Graph): void {
  smooth(g.preamp.gain, 10 ** (state.eq.preamp / 20))
  g.bands.forEach((band, i) => smooth(band.gain, state.eq.bands[i]))
  g.input.disconnect()
  g.input.connect(state.eq.on ? g.preamp : g.balance)
}

function applyMix(): void {
  const gain = (state.volume / 100) ** 2
  if (graph) {
    smooth(graph.volume.gain, gain)
    smooth(graph.balance.pan, state.balance / 100)
  }
  if (direct) direct.volume = gain
}

function wire(element: HTMLAudioElement): void {
  const active = () => element === mediaElement()
  element.addEventListener('loadedmetadata', () => active() && mediaReady(element))
  element.addEventListener('playing', () => active() && state.loading && set({ loading: false }))
  element.addEventListener('waiting', () => active() && state.status === 'playing' && set({ loading: true }))
  element.addEventListener('ended', () => active() && advance())
  element.addEventListener('error', () => active() && mediaFailed(element))
}

function ensureGraph(): Graph {
  if (graph) {
    if (graph.ctx.state !== 'running') void graph.ctx.resume()
    return graph
  }
  const ctx = new AudioContext()
  void ctx.resume()
  const input = ctx.createGain()
  const preamp = ctx.createGain()
  const bands = EQ_FREQS.map((frequency) => {
    const band = ctx.createBiquadFilter()
    band.type = 'peaking'
    band.frequency.value = frequency
    band.Q.value = BAND_Q
    return band
  })
  const balance = ctx.createStereoPanner()
  const volume = ctx.createGain()
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 2048
  analyser.smoothingTimeConstant = 0
  let tail: AudioNode = preamp
  for (const band of bands) tail = tail.connect(band)
  tail.connect(balance).connect(volume).connect(analyser).connect(ctx.destination)
  const media = new Audio()
  media.preload = 'auto'
  media.crossOrigin = 'anonymous'
  ctx.createMediaElementSource(media).connect(input)
  wire(media)
  graph = { ctx, input, preamp, bands, balance, volume, analyser, media }
  applyEq(graph)
  applyMix()
  setupMediaSession()
  return graph
}

// ── Playback ────────────────────────────────────────────────────────────────────────────────────────────────────

type Synth = {
  id: string
  plan: Plan
  /** Track position at `anchorCtx` (or the frozen position while paused/loading). */
  anchorPos: number
  anchorCtx?: number
  /** Next segment index to schedule. */
  next: number
  out?: GainNode
  sources: AudioBufferSourceNode[]
}

type Mode = 'none' | 'synth' | 'media' | 'direct'

const cache = new SegmentCache()
const plans = new Map<string, { song: Song; plan: Plan }>()
const fileUrls = new Map<string, string>()
const probes = new Map<string, Probe>()
let mode: Mode = 'none'
let synth: Synth | undefined
/** Bumped by every operation that invalidates pending async playback work. */
let token = 0
let pump: number | undefined
let pendingPlay = false
let shuffleOrder: string[] = []
let trackSeq = 0

function mediaElement(): HTMLAudioElement | undefined {
  return mode === 'media' ? graph?.media : mode === 'direct' ? direct : undefined
}

function fail(error: unknown): void {
  halt()
  const message = error instanceof Error ? error.message : String(error)
  set({ status: 'stopped', loading: false, error: message || 'Playback failed' })
}

/** Stops whatever is sounding; leaves state alone. */
function halt(): void {
  token++
  if (synth) silence(synth)
  synth = undefined
  const element = mediaElement()
  if (element) {
    element.pause()
    element.removeAttribute('src')
    element.load()
  }
  mode = 'none'
}

function start(index: number): void {
  const track = state.tracks[index]
  if (!track) return
  ensureGraph()
  halt()
  set({
    current: index,
    status: 'playing',
    loading: true,
    error: undefined,
    duration: track.duration ?? 0,
    info: undefined,
  })
  describeSession(track)
  if (track.source.kind === 'synth') void startSynth(track, token)
  else startMedia(track, token)
}

// Synth tracks.

async function planFor(track: Track): Promise<Plan> {
  if (track.source.kind !== 'synth') throw new Error('Not a synth track')
  const song = await track.source.load()
  let entry = plans.get(track.id)
  if (entry?.song !== song) {
    entry = { song, plan: plan(song) }
    plans.set(track.id, entry)
  }
  return entry.plan
}

async function startSynth(track: Track, my: number): Promise<void> {
  let trackPlan: Plan
  try {
    trackPlan = await planFor(track)
  } catch (error) {
    if (my === token) fail(error)
    return
  }
  if (my !== token) return
  mode = 'synth'
  synth = { id: track.id, plan: trackPlan, anchorPos: 0, next: 0, sources: [] }
  set({
    duration: trackPlan.duration,
    info: {
      kbps: Math.round((SAMPLE_RATE * 16 * CHANNELS) / 1000),
      khz: Math.round(SAMPLE_RATE / 1000),
      channels: CHANNELS,
    },
  })
  await synthPlay(synth, 0)
}

function silence(s: Synth): void {
  const out = s.out
  if (graph && out) {
    const now = graph.ctx.currentTime
    out.gain.cancelScheduledValues(now)
    out.gain.setValueAtTime(out.gain.value, now)
    out.gain.linearRampToValueAtTime(0, now + 0.015)
    for (const source of s.sources) {
      source.onended = null
      source.stop(now + 0.02)
    }
    setTimeout(() => out.disconnect(), 100)
  }
  s.sources = []
  s.out = undefined
  s.anchorCtx = undefined
}

function synthTime(s: Synth): number {
  if (!graph || s.anchorCtx === undefined) return s.anchorPos
  return Math.min(s.plan.duration, s.anchorPos + Math.max(0, graph.ctx.currentTime - s.anchorCtx))
}

function scheduleSegment(s: Synth, index: number, pcm: Int16Array, at: number, offset: number, fadeIn: boolean): void {
  if (!graph || !s.out) return
  const source = graph.ctx.createBufferSource()
  source.buffer = toAudioBuffer(graph.ctx, pcm, fadeIn, index < s.plan.segments - 1)
  source.connect(s.out)
  source.start(at, offset)
  source.onended = () => {
    source.disconnect()
    s.sources = s.sources.filter((node) => node !== source)
    if (index === s.plan.segments - 1 && synth === s && state.status === 'playing') advance()
  }
  s.sources.push(source)
}

/** (Re)starts synth playback at `pos`, rendering the segment first if needed. */
async function synthPlay(s: Synth, pos: number): Promise<void> {
  silence(s)
  const my = ++token
  s.anchorPos = Math.max(0, Math.min(s.plan.duration, pos))
  const index = Math.min(s.plan.segments - 1, Math.floor((s.anchorPos * SAMPLE_RATE) / SEGMENT_FRAMES))
  void focusRender(s, index)
  let pcm = cache.peek(s.id, index)
  if (!pcm) {
    if (!state.loading) set({ loading: true })
    try {
      pcm = await cache.segment(s.id, s.plan, index)
    } catch (error) {
      if (my === token) fail(error)
      return
    }
    if (my !== token || synth !== s) return
  }
  if (!graph) return
  const ctx = graph.ctx
  const when = ctx.currentTime + 0.03
  s.out = ctx.createGain()
  s.out.gain.setValueAtTime(0, ctx.currentTime)
  s.out.gain.setValueAtTime(0, when)
  s.out.gain.linearRampToValueAtTime(1, when + 0.01)
  s.out.connect(graph.input)
  s.anchorCtx = when
  s.next = index + 1
  scheduleSegment(s, index, pcm, when, s.anchorPos - (index * SEGMENT_FRAMES) / SAMPLE_RATE, false)
  if (state.loading) set({ loading: false })
  pump ??= window.setInterval(tick, 200)
  tick()
}

/** Renders the current track from the playhead on, then pre-renders the opening of whatever plays next. */
async function focusRender(s: Synth, index: number): Promise<void> {
  cache.focus(s.id, s.plan, index)
  const following = upcoming(true)
  const next = following === undefined ? undefined : state.tracks[following]
  if (next?.source.kind !== 'synth') return
  try {
    const nextPlan = await planFor(next)
    if (synth === s) cache.focus(s.id, s.plan, index, { id: next.id, plan: nextPlan })
  } catch {}
}

/** Keeps the next segments scheduled; stalls (shows loading) if rendering falls behind. */
function tick(): void {
  const s = synth
  if (!s || state.status !== 'playing' || s.anchorCtx === undefined || !graph) return
  const now = graph.ctx.currentTime
  const pos = synthTime(s)
  if (pos >= s.plan.duration && !s.sources.length) {
    advance()
    return
  }
  while (s.next < s.plan.segments) {
    const startPos = (s.next * SEGMENT_FRAMES) / SAMPLE_RATE
    if (startPos - pos > LOOKAHEAD) return
    const at = s.anchorCtx + (startPos - s.anchorPos)
    const pcm = cache.peek(s.id, s.next)
    if (!pcm || at < now + 0.01) {
      // Out of rendered audio before the boundary: freeze there and resume once the segment exists.
      if (at < now + 0.25) void synthPlay(s, startPos)
      return
    }
    scheduleSegment(s, s.next, pcm, at, 0, true)
    s.next++
  }
}

// Files and URLs.

function startMedia(track: Track, my: number): void {
  if (!graph) return
  const source = track.source
  let url: string
  if (source.kind === 'file') {
    url = fileUrls.get(track.id) ?? URL.createObjectURL(source.file)
    fileUrls.set(track.id, url)
  } else if (source.kind === 'url') url = source.url
  else return
  mode = 'media'
  graph.media.src = url
  graph.media.play().catch((error: unknown) => {
    if (my === token && !(error instanceof DOMException && error.name === 'AbortError')) {
      if (graph?.media.error) return // The 'error' event handles load failures (and the CORS fallback).
      fail(error)
    }
  })
}

function mediaReady(element: HTMLAudioElement): void {
  const track = state.tracks[state.current]
  if (!track || !Number.isFinite(element.duration)) return
  const duration = element.duration
  const info = probes.get(track.id)
  const kbps =
    track.source.kind === 'file' && duration > 0 ? Math.round((track.source.file.size * 8) / duration / 1000) : 0
  patchTrack(track.id, { duration })
  set({
    duration,
    info: {
      kbps,
      khz: Math.round((info?.sampleRate ?? graph?.ctx.sampleRate ?? 44100) / 1000),
      channels: info?.channels ?? 2,
    },
  })
}

function mediaFailed(element: HTMLAudioElement): void {
  const track = state.tracks[state.current]
  if (mode === 'media' && track?.source.kind === 'url') {
    // Likely a server without CORS headers: play it outside the graph instead.
    mode = 'direct'
    if (!direct) {
      direct = new Audio()
      wire(direct)
      applyMix()
    }
    direct.src = track.source.url
    const my = token
    direct.play().catch((error: unknown) => {
      if (my === token && !(error instanceof DOMException && error.name === 'AbortError') && !direct?.error) fail(error)
    })
    return
  }
  const code = element.error?.code
  fail(
    new Error(
      code === 4 ? 'Unsupported or unreachable audio' : code === 3 ? 'Could not decode audio' : 'Could not play',
    ),
  )
}

// Playlist order.

function shuffled(ids: string[], first?: string): string[] {
  const order = ids.filter((id) => id !== first)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return first !== undefined && ids.includes(first) ? [first, ...order] : order
}

/** New random pass over the list, starting with `first` (default: the current track). */
function reshuffle(first = state.tracks[state.current]?.id): void {
  shuffleOrder = shuffled(
    state.tracks.map((track) => track.id),
    first,
  )
}

/** Index of the track after the current one; `auto` = end of track (no repeat → stop at the end of the list). */
function upcoming(auto: boolean): number | undefined {
  const { tracks, current, shuffle, repeat } = state
  if (!tracks.length) return undefined
  if (!shuffle) {
    if (current + 1 < tracks.length) return current + 1
    return repeat || !auto ? 0 : undefined
  }
  if (shuffleOrder.length !== tracks.length) reshuffle()
  const at = shuffleOrder.indexOf(tracks[current]?.id ?? '')
  const id = at + 1 < shuffleOrder.length ? shuffleOrder[at + 1] : repeat || !auto ? shuffleOrder[0] : undefined
  const index = tracks.findIndex((track) => track.id === id)
  return index < 0 ? undefined : index
}

function advance(): void {
  const next = upcoming(true)
  if (next === undefined) {
    if (state.shuffle) reshuffle()
    player.stop()
    return
  }
  if (state.shuffle && shuffleOrder.indexOf(state.tracks[next].id) === 0) reshuffle(state.tracks[next].id)
  start(next)
}

function patchTrack(id: string, patch: Partial<Track>): void {
  if (state.tracks.some((track) => track.id === id)) {
    set({ tracks: state.tracks.map((track) => (track.id === id ? { ...track, ...patch } : track)) })
  }
}

/** Replaces the list, keeping the current track (by id) and releasing what's gone. */
function replaceTracks(tracks: Track[]): void {
  const currentId = state.tracks[state.current]?.id
  const current = tracks.findIndex((track) => track.id === currentId)
  const kept = new Set(tracks.map((track) => track.id))
  if (currentId !== undefined && current < 0) {
    halt()
    set({ status: 'stopped', loading: false, duration: 0, info: undefined, error: undefined })
  }
  for (const [id, url] of fileUrls) {
    if (kept.has(id)) continue
    URL.revokeObjectURL(url)
    fileUrls.delete(id)
    probes.delete(id)
  }
  set({ tracks, current })
  reshuffle()
}

/** Tags, title and duration for added files (sequential, so a big drop does not spin up dozens of decoders). */
let describing: Promise<void> = Promise.resolve()
function describe(track: Track & { source: { kind: 'file'; file: File } }): void {
  describing = describing.then(async () => {
    if (!state.tracks.some((t) => t.id === track.id)) return
    const tags = await probe(track.source.file).catch((): Probe => ({}))
    probes.set(track.id, tags)
    const title = tags.title ? (tags.artist ? `${tags.artist} - ${tags.title}` : tags.title) : undefined
    if (title) patchTrack(track.id, { title })
    if (state.tracks.find((t) => t.id === track.id)?.duration !== undefined) return
    const element = new Audio()
    element.preload = 'metadata'
    const url = fileUrls.get(track.id) ?? URL.createObjectURL(track.source.file)
    fileUrls.set(track.id, url)
    const duration = await new Promise<number>((resolve) => {
      const done = () => resolve(element.duration)
      element.addEventListener('loadedmetadata', done, { once: true })
      element.addEventListener('error', done, { once: true })
      setTimeout(done, 10000)
      element.src = url
    })
    element.removeAttribute('src')
    element.load()
    if (Number.isFinite(duration) && duration > 0) patchTrack(track.id, { duration })
  })
}

// Media Session (hardware media keys, OS media overlay).

function setupMediaSession(): void {
  if (!('mediaSession' in navigator)) return
  const session = navigator.mediaSession
  const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
    ['play', () => player.play()],
    ['pause', () => player.pause()],
    ['stop', () => player.stop()],
    ['nexttrack', () => player.next()],
    ['previoustrack', () => player.previous()],
    ['seekto', (details) => details.seekTime !== undefined && player.seek(details.seekTime)],
  ]
  for (const [action, handler] of handlers) {
    try {
      session.setActionHandler(action, handler)
    } catch {}
  }
}

function describeSession(track: Track): void {
  if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return
  const split = track.title.indexOf(' - ')
  navigator.mediaSession.metadata = new MediaMetadata({
    title: split < 0 ? track.title : track.title.slice(split + 3),
    artist: split < 0 ? '' : track.title.slice(0, split),
    album: 'Remyamp',
  })
}

// ── Public API ──────────────────────────────────────────────────────────────────────────────────────────────────

export const player: Player = {
  getState: () => state,
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  time() {
    if (state.status === 'stopped') return 0
    const element = mediaElement()
    if (element) return element.currentTime
    return synth ? synthTime(synth) : 0
  },
  analyser: () => graph?.analyser,

  play(index) {
    ensureGraph()
    if (index !== undefined) return start(index)
    if (state.status === 'paused') {
      set({ status: 'playing' })
      if (synth) void synthPlay(synth, synth.anchorPos)
      else
        void mediaElement()
          ?.play()
          .catch(() => {})
      return
    }
    if (state.current >= 0) return start(state.current)
    if (state.tracks.length) return start(0)
    pendingPlay = true
  },
  pause() {
    if (state.status === 'paused') return player.play()
    if (state.status !== 'playing') return
    if (synth) {
      const pos = synthTime(synth)
      token++
      silence(synth)
      synth.anchorPos = pos
    } else mediaElement()?.pause()
    set({ status: 'paused', loading: false })
  },
  stop() {
    pendingPlay = false
    halt()
    set({ status: 'stopped', loading: false })
  },
  next() {
    const next = upcoming(false)
    if (next === undefined) return
    if (state.shuffle && shuffleOrder.indexOf(state.tracks[next].id) === 0) reshuffle(state.tracks[next].id)
    if (state.status === 'playing' || state.status === 'paused') start(next)
    else set({ current: next, duration: state.tracks[next].duration ?? 0, info: undefined, error: undefined })
  },
  previous() {
    const { tracks, current, shuffle } = state
    if (!tracks.length) return
    let previous = current <= 0 ? tracks.length - 1 : current - 1
    if (shuffle) {
      if (shuffleOrder.length !== tracks.length) reshuffle()
      const at = shuffleOrder.indexOf(tracks[current]?.id ?? '')
      const id = shuffleOrder[at <= 0 ? shuffleOrder.length - 1 : at - 1]
      previous = Math.max(
        0,
        tracks.findIndex((track) => track.id === id),
      )
    }
    if (state.status === 'playing' || state.status === 'paused') start(previous)
    else set({ current: previous, duration: tracks[previous].duration ?? 0, info: undefined, error: undefined })
  },
  seek(seconds) {
    if (state.status === 'stopped' || !Number.isFinite(seconds)) return
    const target = Math.max(0, Math.min(state.duration || Number.POSITIVE_INFINITY, seconds))
    const element = mediaElement()
    if (element) element.currentTime = target
    else if (synth) {
      if (state.status === 'playing') void synthPlay(synth, target)
      else synth.anchorPos = Math.min(target, synth.plan.duration)
    }
    if ('mediaSession' in navigator && state.duration > 0) {
      try {
        navigator.mediaSession.setPositionState({ duration: state.duration, position: target, playbackRate: 1 })
      } catch {}
    }
  },

  setVolume(volume) {
    set({ volume: clamp(volume, 0, 100, state.volume) })
    applyMix()
  },
  setBalance(balance) {
    set({ balance: clamp(balance, -100, 100, state.balance) })
    applyMix()
  },
  toggleShuffle() {
    set({ shuffle: !state.shuffle })
    reshuffle()
  },
  toggleRepeat() {
    set({ repeat: !state.repeat })
  },
  setEq(patch) {
    const eq: EqState = {
      on: patch.on ?? state.eq.on,
      auto: patch.auto ?? state.eq.auto,
      preamp: clamp(patch.preamp, -12, 12, state.eq.preamp),
      bands: EQ_FREQS.map((_, i) => clamp(patch.bands?.[i], -12, 12, state.eq.bands[i])),
    }
    set({ eq })
    if (graph) applyEq(graph)
  },
  presets: PRESETS,

  addFiles(files, playFirst) {
    const added = files
      .filter((file) => file.type.startsWith('audio/') || AUDIO_FILE.test(file.name))
      .map((file) => ({
        id: `file:${++trackSeq}`,
        title: nameTitle(file.name),
        source: { kind: 'file' as const, file },
      }))
    if (!added.length) return 0
    const first = state.tracks.length
    set({ tracks: [...state.tracks, ...added] })
    reshuffle()
    for (const track of added) describe(track)
    if (playFirst) start(first)
    return added.length
  },
  addUrl(url, playFirst) {
    const trimmed = url.trim()
    if (!trimmed) return
    let title = trimmed
    try {
      const path = new URL(trimmed, location.href).pathname.split('/').filter(Boolean).pop()
      if (path) title = nameTitle(decodeURIComponent(path))
    } catch {}
    set({ tracks: [...state.tracks, { id: `url:${++trackSeq}`, title, source: { kind: 'url', url: trimmed } }] })
    reshuffle()
    if (playFirst) start(state.tracks.length - 1)
  },
  remove(ids) {
    const gone = new Set(ids)
    replaceTracks(state.tracks.filter((track) => !gone.has(track.id)))
  },
  reorder(ids) {
    const byId = new Map(state.tracks.map((track) => [track.id, track]))
    const ordered = ids.flatMap((id) => byId.get(id) ?? [])
    const listed = new Set(ordered.map((track) => track.id))
    replaceTracks([...ordered, ...state.tracks.filter((track) => !listed.has(track.id))])
  },
  resetPlaylist() {
    void loadLibrary().then(replaceTracks)
  },

  shutdown() {
    pendingPlay = false
    halt()
    clearInterval(pump)
    pump = undefined
    cache.clear()
    direct = undefined
    if (graph) {
      graph.media.removeAttribute('src')
      graph.media.load()
      void graph.ctx.close()
      graph = undefined
    }
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = null
    set({ status: 'stopped', loading: false })
  },
}

export function usePlayer<T>(select: (s: PlayerState) => T): T {
  return useSyncExternalStore(player.subscribe, () => select(state))
}

void loadLibrary().then((library) => {
  const currentId = state.tracks[state.current]?.id
  const tracks = [...library, ...state.tracks]
  const found = tracks.findIndex((track) => track.id === currentId)
  // Like Winamp, a fresh list has its first entry loaded (stopped), so Next/Previous step from it.
  if (found >= 0) set({ tracks, current: found })
  else set({ tracks, current: tracks.length ? 0 : -1, duration: tracks[0]?.duration ?? 0 })
  reshuffle()
  if (pendingPlay && found < 0 && tracks.length) {
    pendingPlay = false
    start(0)
  }
})
