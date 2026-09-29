/** Build-time portrait knowledge and decoded pixel atlases. Regenerate with npm run quest:art. */
import type { ActorLook } from '../types'

export type ArtType = 'BULL' | 'BEAR' | 'WHALE' | 'DEGEN'

/** Colors sampled from the original art (CSS hex). */
export interface RemyPalette {
  skin: string
  hair: string
  shirt: string
  bg: string
  accent: string
  eye: string
}

export interface RemyArt {
  palette: RemyPalette
  look: ActorLook
  type: ArtType
  bald: boolean
  /** A short art-derived nickname; the original collection index remains the identity. */
  epithet: string
}

/** Source rectangle; cached so drawing a Remy never allocates or decodes an image. */
export interface AtlasRect {
  img: CanvasImageSource
  sx: number
  sy: number
  sw: number
  sh: number
}

const COUNT = 4490
const COLS = 67
const TYPES: ArtType[] = ['BULL', 'BEAR', 'WHALE', 'DEGEN']
const HAIR: ActorLook['hair'][] = ['bald', 'short', 'spiky', 'long', 'cap', 'beanie', 'afro', 'bun']
type ArtRow = [string, string, string, string, string, string, number, number, number, number, string]
let rows: ArtRow[] | null = null
const cache = new Map<number, RemyArt>()
const headRects = new Map<number, AtlasRect>()
const miniRects = new Map<number, AtlasRect>()
let heads: CanvasImageSource | null = null
let minis: CanvasImageSource | null = null
const normalize = (idx: number) => Number.isFinite(idx) ? ((Math.trunc(idx) % COUNT) + COUNT) % COUNT : 0

async function resource(path: string): Promise<Blob> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const response = await fetch(`/quest/${path}`, { signal: controller.signal })
    if (!response.ok) throw new Error(`Art resource: ${response.status}`)
    // Read the body within the timeout, not just the response headers.
    return await response.blob()
  } finally {
    clearTimeout(timeout)
  }
}

async function image(path: string, size: number): Promise<CanvasImageSource> {
  const blob = await resource(path)
  const expectedHeight = Math.ceil(COUNT / COLS) * size
  const url = URL.createObjectURL(blob)
  let timeout: number | undefined
  try {
    // Decode once with the broadly supported Image path. Bound decode as well as
    // fetch, so a suspended or failed decoder cannot strand the loading screen.
    const img = new Image()
    img.src = url
    await Promise.race([
      img.decode(),
      new Promise<never>((_, reject) => {
        timeout = window.setTimeout(() => reject(new Error('Art atlas decode timed out')), 20000)
      }),
    ])
    if (img.width !== COLS * size || img.height !== expectedHeight) throw new Error('Invalid art atlas dimensions')
    return img
  } finally {
    clearTimeout(timeout)
    URL.revokeObjectURL(url)
  }
}

function rect(idx: number, img: CanvasImageSource | null, size: number, rects: Map<number, AtlasRect>): AtlasRect | null {
  if (!img) return null
  const index = normalize(idx)
  let result = rects.get(index)
  if (!result) {
    result = { img, sx: (index % COLS) * size, sy: Math.floor(index / COLS) * size, sw: size, sh: size }
    rects.set(index, result)
  }
  return result
}

export const art = {
  /** Completed resources / three. Failures also complete, so boot can gracefully proceed. */
  progress: 0,
  ready: Promise.resolve() as Promise<void>,
  get(idx: number): RemyArt {
    const index = normalize(idx)
    const hit = cache.get(index)
    if (hit) return hit
    const row = rows?.[index]
    let result: RemyArt
    if (row) {
      const [skin, hair, shirt, bg, accent, eye] = row.slice(0, 6).map((c) => `#${c}`)
      result = {
        palette: { skin, hair, shirt, bg, accent, eye },
        look: {
          skin, hair: HAIR[row[6]], hairColor: hair, shirt, pants: '#334562',
          ...(row[7] ? { extra: 'shades' as const } : {}),
        },
        type: TYPES[row[8]], bald: Boolean(row[9]), epithet: row[10],
      }
    } else {
      const h = (index * 2654435761) >>> 0
      const hair = `hsl(${h % 360} 55% 45%)`
      result = {
        palette: { skin: '#f6d2b3', hair, shirt: '#ffffff', bg: '#6a8cff', accent: hair, eye: '#3a4a9a' },
        look: { skin: '#f6d2b3', hair: 'short', hairColor: '#6b4a2a', shirt: '#ffffff', pants: '#2f4f9a' },
        type: TYPES[h % 4], bald: false, epithet: 'Original Remy',
      }
    }
    cache.set(index, result)
    return result
  },
  head(idx: number): AtlasRect | null {
    return rect(idx, heads, 16, headRects)
  },
  mini(idx: number): AtlasRect | null {
    return rect(idx, minis, 32, miniRects)
  },
}

art.ready = Promise.allSettled([
  (async () => {
    const data = JSON.parse(await (await resource('art.json')).text())
    if (data.v !== 1 || data.cols !== COLS || data.count !== COUNT || !Array.isArray(data.rows) || data.rows.length !== COUNT) {
      throw new Error('Invalid art catalogue')
    }
    for (const row of data.rows) {
      if (!Array.isArray(row) || row.length !== 11 || !row.slice(0, 6).every((c) => typeof c === 'string' && /^[0-9a-f]{6}$/.test(c))
        || !Number.isInteger(row[6]) || !HAIR[row[6]] || !Number.isInteger(row[8]) || !TYPES[row[8]]
        || typeof row[10] !== 'string') throw new Error('Invalid art record')
    }
    rows = data.rows
    cache.clear()
  })(),
  image('heads.webp', 16).then((img) => { heads = img }),
  image('minis.webp', 32).then((img) => { minis = img }),
].map((promise) => promise.finally(() => { art.progress += 1 / 3 }))).then(() => { art.progress = 1 })
