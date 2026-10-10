import { loadSong } from '../../quest/music/songs'
import type { Song } from '../../quest/music/song'
import type { Track as QuestTrack } from '../../quest/types'
import { plan } from './synth'
import type { Track } from './types'

/**
 * The built-in Remy playlist. Titles and durations come from the songs themselves, so the library loads every song
 * module up front (once, when the player module is first imported, i.e. when Winamp opens). They are plain note
 * data of a few KB each and already split into their own lazy chunks, so this costs a handful of tiny parallel
 * requests — versus a hand-kept title/tempo table that would silently drift from the songs.
 */
type Entry = { id: string; artist: string; load: () => Promise<Song>; oneShot?: boolean }

const QUEST: QuestTrack[] = [
  'title',
  'town',
  'route',
  'city',
  'canyon',
  'battle',
  'trainer',
  'boss',
  'victory',
  'ending',
  'cabald',
  'gallery',
]

// Dynamic imports on purpose: each song stays its own chunk (like the Quest songs), fetched only once Winamp opens.
const ENTRIES: Entry[] = [
  {
    id: 'remy:intro',
    artist: 'DJ Remy Llama',
    load: async () => (await import('../songs/intro')).default,
    oneShot: true,
  },
  { id: 'remy:demoscene', artist: 'Remy Boys', load: async () => (await import('../songs/demoscene')).default },
  { id: 'remy:eurodance', artist: 'Remy Boys', load: async () => (await import('../songs/eurodance')).default },
  { id: 'remy:lofi', artist: 'Remy Boys', load: async () => (await import('../songs/lofi')).default },
  { id: 'remy:mountainking', artist: 'Remy Boys', load: async () => (await import('../songs/mountainking')).default },
  { id: 'remy:furelise', artist: 'Remy Boys', load: async () => (await import('../songs/furelise')).default },
  { id: 'remy:odetojoy', artist: 'Remy Boys', load: async () => (await import('../songs/odetojoy')).default },
  { id: 'remy:canon', artist: 'Remy Boys', load: async () => (await import('../songs/canon')).default },
  { id: 'remy:bumblebee', artist: 'Remy Boys', load: async () => (await import('../songs/bumblebee')).default },
  ...QUEST.map((track): Entry => ({ id: `quest:${track}`, artist: 'Remy Quest OST', load: () => loadSong(track) })),
  {
    id: 'haunt:cabald',
    artist: 'Night of the Cabald OST',
    load: async () => (await import('../../haunt/song')).default,
  },
]

let library: Promise<Track[]> | undefined

/** Built-in tracks in playlist order (memoized). Songs flagged one-shot render once with their tail. */
export function loadLibrary(): Promise<Track[]> {
  library ??= Promise.allSettled(
    ENTRIES.map(async ({ id, artist, load, oneShot }): Promise<Track> => {
      const loaded = await load()
      const song = oneShot ? { ...loaded, loopStart: loaded.length } : loaded
      return {
        id,
        title: `${artist} - ${song.title}`,
        duration: plan(song).duration,
        source: { kind: 'synth', load: async () => song },
      }
    }),
  ).then((results) =>
    results.flatMap((result, index) => {
      if (result.status === 'fulfilled') return [result.value]
      console.warn(`Remyamp: could not load ${ENTRIES[index].id}`, result.reason)
      return []
    }),
  )
  return library
}
