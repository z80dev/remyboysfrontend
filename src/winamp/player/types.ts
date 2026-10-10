import type { Song } from '../../quest/music/song'

/**
 * Player contract between the audio side (player/) and the skinned UI (ui/).
 * The player is a module singleton outside React: playback survives the window unmounting/minimizing.
 */

export type TrackSource =
  /** Runtime-synthesized song (Remy Quest engine); rendered to audio on demand. */
  | { kind: 'synth'; load: () => Promise<Song> }
  /** A file the visitor added (drag-and-drop / ADD FILE / ADD DIR). */
  | { kind: 'file'; file: File }
  /** Any URL the browser can play (ADD URL). */
  | { kind: 'url'; url: string }

export type Track = {
  id: string
  /** Playlist / marquee text, e.g. "Remy Boys - Based Trance". */
  title: string
  /** Seconds; undefined until known (shown blank in the playlist). Built-in tracks know it up front. */
  duration?: number
  source: TrackSource
}

export type Status = 'stopped' | 'playing' | 'paused'

export type EqState = {
  on: boolean
  auto: boolean
  /** dB, -12..12. */
  preamp: number
  /** dB, -12..12, for 60, 170, 310, 600, 1k, 3k, 6k, 12k, 14k, 16k Hz. */
  bands: number[]
}

export type PlayerState = {
  tracks: Track[]
  /** Index into `tracks` of the loaded track; -1 = none. */
  current: number
  status: Status
  /** Rendering/buffering the current track (marquee shows it; play indicator shows "working"). */
  loading: boolean
  /** Last error for the current track (marquee shows it), cleared on the next load. */
  error?: string
  /** Seconds of the loaded track (0 if unknown). Playback position is NOT state: read `player.time()` per frame. */
  duration: number
  /** Info for the display: kbps (rounded), kHz (rounded), channels. Undefined until loaded. */
  info?: { kbps: number; khz: number; channels: number }
  /** 0..100, default 75. */
  volume: number
  /** -100 (left) .. 100 (right). */
  balance: number
  shuffle: boolean
  repeat: boolean
  eq: EqState
}

export const EQ_FREQS = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000] as const

export type EqPreset = { name: string; preamp: number; bands: number[] }

export interface Player {
  getState(): PlayerState
  /** For useSyncExternalStore. Fires on every state change (not on time progress). */
  subscribe(listener: () => void): () => void
  /** Current position in seconds (cheap; call per animation frame). */
  time(): number
  /** Live analyser for the visualizer (fftSize 2048, post-EQ/volume), or undefined before audio is unlocked. */
  analyser(): AnalyserNode | undefined

  /** Play the track at `index` from the start; no index = resume if paused, restart if playing, play current/first if stopped. */
  play(index?: number): void
  pause(): void
  stop(): void
  next(): void
  previous(): void
  /** Seconds, clamped to [0, duration]. */
  seek(seconds: number): void

  setVolume(volume: number): void
  setBalance(balance: number): void
  toggleShuffle(): void
  toggleRepeat(): void
  setEq(eq: Partial<EqState>): void
  /** Built-in Winamp presets (Classical, Club, Dance, …). */
  presets: readonly EqPreset[]

  /** Appends files (audio types only; others ignored); returns how many were added. `playFirst` starts the first added one. */
  addFiles(files: File[], playFirst?: boolean): number
  addUrl(url: string, playFirst?: boolean): void
  /** Removes by track id (stops if the current track is removed). */
  remove(ids: string[]): void
  /** Replaces the list order (same ids, new order); keeps the current track. */
  reorder(ids: string[]): void
  /** Built-in Remy library back in its default order. */
  resetPlaylist(): void

  /** Stops playback and releases audio (Winamp window closed). The playlist and settings stay. */
  shutdown(): void
}
