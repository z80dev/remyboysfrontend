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
  /** Bald Remys are, without exception, members of the Cabald (and the Cabald is only bald Remys). */
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

/**
 * Full-body battle sprite (committed per Remy at /quest/sprites/<idx>.webp): a cut-out, palette-quantized, outlined
 * chibi of the original art in its native three-quarter pose. Never mirror it: shirt slogans and meme captions are
 * part of the art. Transparent background; the body is centred on x = SPRITE_W / 2 and the shoe soles rest on row
 * SPRITE_FEET. The FAR variant (/quest/sprites/far/) is the same Remy re-reduced from the source at exactly 2/3 size,
 * for the distant foe on short screens.
 */
export const SPRITE_W = 76
export const SPRITE_H = 116
export const SPRITE_FEET = 113
export const SPRITE_FAR_W = 52
export const SPRITE_FAR_H = 79
export const SPRITE_FAR_FEET = 76

const COUNT = 4490
const COLS = 67
const TYPES: ArtType[] = ['BULL', 'BEAR', 'WHALE', 'DEGEN']
const HAIR: ActorLook['hair'][] = ['bald', 'short', 'spiky', 'long', 'cap', 'beanie', 'afro', 'bun']
type ArtRow = [string, string, string, string, string, string, number, number, number, number, string]
let rows: ArtRow[] | null = null
let baldCache: number[] | null = null
const cache = new Map<number, RemyArt>()
const headRects = new Map<number, AtlasRect>()
const sideRects = new Map<number, AtlasRect>()
const miniRects = new Map<number, AtlasRect>()
const sprites = new Map<number, Promise<HTMLCanvasElement>>()
let heads: CanvasImageSource | null = null
let sides: CanvasImageSource | null = null
let minis: CanvasImageSource | null = null
const normalize = (idx: number) => (Number.isFinite(idx) ? ((Math.trunc(idx) % COUNT) + COUNT) % COUNT : 0)

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

/** Fallback when a sprite file is unreachable: the 32px portrait scaled into the sprite frame. */
function fallbackSprite(index: number, far: boolean): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = far ? SPRITE_FAR_W : SPRITE_W
  c.height = far ? SPRITE_FAR_H : SPRITE_H
  const x = c.getContext('2d') as CanvasRenderingContext2D
  x.imageSmoothingEnabled = false
  const m = art.mini(index)
  const size = far ? 32 : 64
  if (m) x.drawImage(m.img, m.sx, m.sy, m.sw, m.sh, (c.width - size) >> 1, (far ? SPRITE_FAR_FEET : SPRITE_FEET) - size, size, size)
  return c
}

async function loadSprite(index: number, far: boolean): Promise<HTMLCanvasElement> {
  try {
    const img = new Image()
    img.src = `/quest/sprites/${far ? 'far/' : ''}${index}.webp`
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    ;(c.getContext('2d') as CanvasRenderingContext2D).drawImage(img, 0, 0)
    return c
  } catch {
    return fallbackSprite(index, far)
  }
}

export const art = {
  /** Completed resources / total. Failures also complete, so boot can gracefully proceed. */
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
          skin,
          hair: HAIR[row[6]],
          hairColor: hair,
          shirt,
          pants: '#334562',
          ...(row[7] ? { extra: 'shades' as const } : {}),
        },
        type: TYPES[row[8]],
        bald: Boolean(row[9]),
        epithet: row[10],
      }
    } else {
      const h = (index * 2654435761) >>> 0
      const hair = `hsl(${h % 360} 55% 45%)`
      result = {
        palette: { skin: '#f6d2b3', hair, shirt: '#ffffff', bg: '#6a8cff', accent: hair, eye: '#3a4a9a' },
        look: { skin: '#f6d2b3', hair: 'short', hairColor: '#6b4a2a', shirt: '#ffffff', pants: '#2f4f9a' },
        type: TYPES[h % 4],
        bald: false,
        epithet: 'Original Remy',
      }
    }
    cache.set(index, result)
    return result
  },
  /** 16px front-facing overworld head. */
  head(idx: number): AtlasRect | null {
    return rect(idx, heads, 16, headRects)
  },
  /** 16px profile head facing right (flip for left). */
  side(idx: number): AtlasRect | null {
    return rect(idx, sides, 16, sideRects)
  },
  /** 32px posterized portrait of the full original frame. */
  mini(idx: number): AtlasRect | null {
    return rect(idx, minis, 32, miniRects)
  },
  /** Resolves with the decoded battle sprite (cached; never rejects). `far` = the 2/3-size distant-foe variant. */
  sprite(idx: number, far = false): Promise<HTMLCanvasElement> {
    const index = normalize(idx)
    const key = far ? -1 - index : index
    let p = sprites.get(key)
    if (!p) {
      p = loadSprite(index, far)
      sprites.set(key, p)
    }
    return p
  },
  /** Every bald Remy — the Cabald's entire membership — ascending. Empty until the catalogue loads. */
  baldList(): number[] {
    if (!rows) return []
    if (!baldCache) baldCache = rows.flatMap((r, i) => (r[9] ? [i] : []))
    return baldCache
  },
}

art.ready = Promise.allSettled(
  [
    (async () => {
      const data = JSON.parse(await (await resource('art.json')).text())
      if (data.v !== 1 || data.cols !== COLS || data.count !== COUNT || !Array.isArray(data.rows) || data.rows.length !== COUNT) {
        throw new Error('Invalid art catalogue')
      }
      for (const row of data.rows) {
        if (
          !Array.isArray(row) ||
          row.length !== 11 ||
          !row.slice(0, 6).every((c) => typeof c === 'string' && /^[0-9a-f]{6}$/.test(c)) ||
          !Number.isInteger(row[6]) ||
          !HAIR[row[6]] ||
          !Number.isInteger(row[8]) ||
          !TYPES[row[8]] ||
          typeof row[10] !== 'string'
        )
          throw new Error('Invalid art record')
      }
      rows = data.rows
      baldCache = null
      cache.clear()
    })(),
    image('heads.webp', 16).then((img) => {
      heads = img
    }),
    image('sides.webp', 16).then((img) => {
      sides = img
    }),
    image('minis.webp', 32).then((img) => {
      minis = img
    }),
  ].map((promise) =>
    promise.finally(() => {
      art.progress += 1 / 4
    }),
  ),
).then(() => {
  art.progress = 1
})
