/**
 * Remy's Harvest art: painted with the Codex image tool (scripts/harvest-art.py), cut and packed by
 * scripts/harvest-sprites.py. Vite fingerprints the files, so they cache forever under /assets.
 */
import bgDayUrl from './art/bg-day.webp'
import bgNightUrl from './art/bg-night.webp'
import beansUrl from './art/beans.webp'
import cabaldUrl from './art/cabald.webp'
import cornUrl from './art/corn.webp'
import gemUrl from './art/gem.webp'
import goldenUrl from './art/golden.webp'
import heroCheerUrl from './art/hero-cheer.webp'
import heroDizzyUrl from './art/hero-dizzy.webp'
import heroIdleUrl from './art/hero-idle.webp'
import rottenUrl from './art/rotten.webp'
import squashUrl from './art/squash.webp'
import titleUrl from './art/title.webp'
import type { Kind, Mood } from './game'

export interface Art {
  bgDay: HTMLImageElement
  bgNight: HTMLImageElement
  title: HTMLImageElement
  hero: Record<Mood, HTMLImageElement>
  items: Record<Kind, HTMLImageElement>
}

/** hero-*.webp are 360 px tall; in hero-idle the basket spans x 43–148 and its mouth starts at y 180 (measured). */
export const HERO_PX = 360
export const HERO_BASKET_X = 95.5
export const HERO_RIM_Y = 180
/** The sun and the harvest moon in the background paintings, as fractions of the image. */
export const SUN = { x: 0.727, y: 0.557 }
export const MOON = { x: 0.744, y: 0.512 }

export async function loadArt(progress: (k: number) => void): Promise<Art> {
  const urls = {
    bgDay: bgDayUrl,
    bgNight: bgNightUrl,
    title: titleUrl,
    idle: heroIdleUrl,
    dizzy: heroDizzyUrl,
    cheer: heroCheerUrl,
    corn: cornUrl,
    golden: goldenUrl,
    gem: gemUrl,
    squash: squashUrl,
    beans: beansUrl,
    rotten: rottenUrl,
    cabald: cabaldUrl,
  }
  const entries = Object.entries(urls)
  let done = 0
  const imgs = await Promise.all(
    entries.map(async ([key, url]) => {
      const img = new Image()
      img.src = url
      await img.decode()
      progress(++done / entries.length)
      return [key, img] as const
    }),
  )
  const m = Object.fromEntries(imgs) as Record<keyof typeof urls, HTMLImageElement>
  return {
    bgDay: m.bgDay,
    bgNight: m.bgNight,
    title: m.title,
    hero: { idle: m.idle, dizzy: m.dizzy, cheer: m.cheer },
    items: { corn: m.corn, golden: m.golden, gem: m.gem, squash: m.squash, beans: m.beans, rotten: m.rotten, cabald: m.cabald },
  }
}
