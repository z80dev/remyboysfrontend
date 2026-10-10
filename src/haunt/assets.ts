/**
 * Remy art for Night of the Cabald, fetched lean for a post embed: the art catalogue (palettes + the bald roster), a
 * handful of 128px portraits and ~12 Remy Quest battle sprites (≈8 KB each). Nothing here blocks on a failed file.
 */
import { questSrc, remySrc } from '../lib/media'
import { type Tex, canvas, texOf } from './gfx'

export const REMY_COUNT = 4490

export interface Catalogue {
  /** Every bald Remy: the Cabald's whole membership. */
  bald: number[]
  palette(idx: number): { skin: string; shirt: string }
}

type Row = [string, string, string, string, string, string, number, number, number, number, string]

export async function loadCatalogue(): Promise<Catalogue | null> {
  try {
    const res = await fetch(questSrc('art.json'))
    if (!res.ok) return null
    const data: unknown = await res.json()
    if (!data || typeof data !== 'object' || !('rows' in data) || !Array.isArray(data.rows)) return null
    const rows = data.rows as Row[]
    return {
      bald: rows.flatMap((r, i) => (r[9] ? [i] : [])),
      palette: (idx) => {
        const r = rows[idx]
        return r ? { skin: `#${r[0]}`, shirt: `#${r[2]}` } : { skin: '#f6d2b3', shirt: '#ffffff' }
      },
    }
  } catch {
    return null
  }
}

export async function loadImage(src: string): Promise<HTMLImageElement | null> {
  const img = new Image()
  img.src = src
  try {
    await Promise.race([img.decode(), new Promise((_, reject) => setTimeout(reject, 15000))])
    return img
  } catch {
    return null
  }
}

export const remyFace = (idx: number) => loadImage(remySrc(idx, 128))

/** The Remy Quest full-body chibi (76×116, feet at row 113) as a Tex. */
export async function remySprite(idx: number): Promise<Tex | null> {
  const img = await loadImage(questSrc(`sprites/${idx}.webp`))
  if (!img) return null
  const [c, x] = canvas(img.naturalWidth, img.naturalHeight)
  x.drawImage(img, 0, 0)
  return texOf(c)
}

export const randomRemy = (exclude: number[] = []) => {
  for (;;) {
    const i = Math.floor(Math.random() * REMY_COUNT)
    if (!exclude.includes(i)) return i
  }
}
