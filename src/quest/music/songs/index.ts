import type { Track } from '../../types'
import type { Song } from '../song'

const modules: Record<Track, () => Promise<{ default: Song }>> = {
  title: () => import('./title'),
  town: () => import('./town'),
  route: () => import('./route'),
  city: () => import('./city'),
  canyon: () => import('./canyon'),
  battle: () => import('./battle'),
  trainer: () => import('./trainer'),
  boss: () => import('./boss'),
  victory: () => import('./victory'),
  ending: () => import('./ending'),
  cabald: () => import('./cabald'),
  gallery: () => import('./gallery'),
}

export async function loadSong(track: Track): Promise<Song> {
  return (await modules[track]()).default
}
