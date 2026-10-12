/**
 * Remy art for classic games: decoded-image cache, deterministic picking and the Cabald roster. Index space is the
 * ORIGINAL art index (`Character<idx>.webp`, `0 … REMY_COUNT - 1`), not the current token id.
 */
import { type RemyWidth, questSrc, remySrc } from '../../lib/media'

/** Number of original Remy art indexes: valid indexes are the integers `0 … REMY_COUNT - 1` (4,490 originals). */
export const REMY_COUNT = 4490

const DECODE_TIMEOUT_MS = 15000

/** True when `idx` is an integer in `0 … REMY_COUNT - 1`. */
export function isRemyIndex(idx: number): boolean {
  return Number.isInteger(idx) && idx >= 0 && idx < REMY_COUNT
}

const images = new Map<string, Promise<HTMLImageElement>>()

async function decode(src: string): Promise<HTMLImageElement> {
  const img = new Image()
  img.src = src
  let timer: number | undefined
  try {
    await Promise.race([
      img.decode(),
      new Promise<never>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error('Remy decode timed out')), DECODE_TIMEOUT_MS)
      }),
    ])
    return img
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Load and decode a Remy portrait from `/media/remy/…`. Results are cached per `(idx, width)` so drawing never
 * re-decodes; concurrent callers share one request. Rejects with `RangeError` for an invalid index and with an
 * `Error` for a failed or timed-out load (the failure is evicted so a later call retries).
 * @param idx original art index, `0 … REMY_COUNT - 1`.
 * @param width variant width, 128 | 320 | 600 (default 128).
 */
export function loadRemy(idx: number, width: RemyWidth = 128): Promise<HTMLImageElement> {
  if (!isRemyIndex(idx)) return Promise.reject(new RangeError(`Remy index out of range: ${idx}`))
  const key = `${width}:${idx}`
  let hit = images.get(key)
  if (!hit) {
    const p = decode(remySrc(idx, width))
    hit = p
    images.set(key, p)
    p.catch(() => {
      if (images.get(key) === p) images.delete(key)
    })
  }
  return hit
}

/**
 * Small deterministic PRNG (mulberry32).
 * @param seed any number; truncated to an unsigned 32-bit integer.
 * @returns a function yielding floats in `[0, 1)`; same seed, same sequence.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Pick `n` DISTINCT original art indexes, deterministically from `seed` (a daily seed gives everyone the same board).
 * Partial Fisher–Yates over the whole range with a sparse swap map, so cost is O(n), not O(REMY_COUNT).
 * @param seed integer seed fed to {@link mulberry32}.
 * @param n how many to pick; clamped to `0 … REMY_COUNT`.
 * @returns indexes in pick order (not sorted).
 */
export function pickRemys(seed: number, n: number): number[] {
  const count = Math.min(REMY_COUNT, Math.max(0, Math.trunc(n) || 0))
  const rand = mulberry32(seed)
  const swapped = new Map<number, number>()
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(rand() * (REMY_COUNT - i))
    out.push(swapped.get(j) ?? j)
    swapped.set(j, swapped.get(i) ?? i)
  }
  return out
}

type ArtRow = [string, string, string, string, string, string, number, number, number, number, string]
type Catalogue = { rows: ArtRow[]; bald: number[]; baldSet: Set<number> }
let catalogue: Promise<Catalogue> | undefined
const palettes = new Map<number, RemyPalette>()
const normalize = (idx: number) => (Number.isFinite(idx) ? ((Math.trunc(idx) % REMY_COUNT) + REMY_COUNT) % REMY_COUNT : 0)

async function fetchCatalogue(): Promise<Catalogue> {
  const res = await fetch(questSrc('art.json'))
  if (!res.ok) throw new Error(`art.json: ${res.status}`)
  const data: unknown = await res.json()
  if (
    typeof data !== 'object' ||
    data === null ||
    !('rows' in data) ||
    !Array.isArray(data.rows) ||
    !('v' in data) ||
    data.v !== 1 ||
    !('cols' in data) ||
    data.cols !== 67 ||
    !('count' in data) ||
    data.count !== REMY_COUNT ||
    data.rows.length !== REMY_COUNT
  )
    throw new Error('Invalid art catalogue')
  const bald: number[] = []
  for (let i = 0; i < data.rows.length; i++) {
    const row = data.rows[i]
    if (
      !Array.isArray(row) ||
      row.length !== 11 ||
      !row.slice(0, 6).every((c) => typeof c === 'string' && /^[0-9a-f]{6}$/.test(c)) ||
      !Number.isInteger(row[6]) ||
      row[6] < 0 ||
      row[6] > 7 ||
      !Number.isInteger(row[8]) ||
      row[8] < 0 ||
      row[8] > 3 ||
      typeof row[10] !== 'string'
    )
      throw new Error('Invalid art record')
    if (row[9]) bald.push(i)
  }
  return { rows: data.rows as ArtRow[], bald, baldSet: new Set(bald) }
}

function loadCatalogue(): Promise<Catalogue> {
  if (!catalogue) {
    const pending = fetchCatalogue()
    catalogue = pending
    pending.catch(() => {
      if (catalogue === pending) catalogue = undefined
    })
  }
  return catalogue
}

/**
 * The Cabald roster: every bald Remy's original art index, ascending. Fetches Quest's `art.json` once (the URL is
 * content-hashed and immutable, so the browser cache serves it afterwards) and caches it; each caller gets its own
 * copy. Rejects when the fetch or catalogue is bad (never a fake empty roster); the failure is evicted so a later
 * call retries.
 */
export function loadCabald(): Promise<number[]> {
  return loadCatalogue().then((data) => data.bald.slice())
}

/** Named story seeds, resolved by cabaldRemy/civRemy to the same faces as Remy Quest. */
export const CAST = {
  RUG_LORD: 67,
  NOBODY: 10,
  SHORT: 1010,
  SQUEEZE: 57,
  ESCROW: 2086,
  AMY: 60,
  CARL: 2038,
  DAN: 5757,
  RAY: 1000,
  GWEI: 46,
  RIVAL: 42,
  NURSE: 14,
  CLERK: 6,
  MAXI: 2084,
  GOLD: 2002,
  CURATOR: 2016,
} as const

// Identity algorithms ported verbatim from src/quest/data.ts; importing it would eagerly load Quest's art atlases.
function castHash(n: number): number {
  let x = (n + 0x9e3779b9) | 0
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b)
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35)
  return (x ^ (x >>> 16)) >>> 0
}

/** Resolve a Cabald story seed exactly like Quest's cabaldRemy, after loading the canonical membership roster. */
export async function cabaldRemy(seed: number): Promise<number> {
  const { bald: members, baldSet } = await loadCatalogue()
  if (!members.length || (seed >= 0 && seed < REMY_COUNT && baldSet.has(normalize(seed)))) return seed
  return members[castHash(seed ^ 0x0cab41d) % members.length]
}

/** Resolve a civilian story seed exactly like Quest's civRemy (the seed itself, or the next Remy with hair). */
export async function civRemy(seed: number): Promise<number> {
  const { baldSet } = await loadCatalogue()
  for (let i = 0; i < REMY_COUNT; i++) {
    const idx = (seed + i) % REMY_COUNT
    if (baldSet.has(normalize(idx))) continue
    return idx
  }
  return seed
}

/** Six original-art colours, in CSS #rrggbb form, shared with the Cabald catalogue request. */
export type RemyPalette = { skin: string; hair: string; shirt: string; bg: string; accent: string; eye: string }

/** Load an original portrait's sampled palette; cached without fetching the atlases. */
export async function loadPalette(idx: number): Promise<RemyPalette> {
  const index = normalize(idx)
  const hit = palettes.get(index)
  if (hit) return hit
  const { rows } = await loadCatalogue()
  const cached = palettes.get(index)
  if (cached) return cached
  const row = rows[index]
  const palette = { skin: `#${row[0]}`, hair: `#${row[1]}`, shirt: `#${row[2]}`, bg: `#${row[3]}`, accent: `#${row[4]}`, eye: `#${row[5]}` }
  palettes.set(index, palette)
  return palette
}

/** Source rectangle in either 16px Quest head atlas. */
export type HeadRect = { sx: number; sy: number; sw: number; sh: number }
/** Front/profile atlases with cached source rectangles; no portrait bulk loading. */
export type RemyHeads = { front: CanvasImageSource; side: CanvasImageSource; rect: (idx: number) => HeadRect }
/** Front-only atlas handle for games that do not use profile sprites. */
export type FrontRemyHeads = { front: CanvasImageSource; rect: (idx: number) => HeadRect }
let frontHeads: Promise<FrontRemyHeads> | undefined
let heads: Promise<RemyHeads> | undefined

/** Decode only Quest's front head atlas, sharing its image and cached rectangles with loadHeads. */
export function loadFrontHeads(): Promise<FrontRemyHeads> {
  if (!frontHeads) {
    const pending = decode(questSrc('heads.webp')).then((front) => {
      const rects = new Map<number, HeadRect>()
      return {
        front,
        rect(idx: number): HeadRect {
          const index = normalize(idx)
          let rect = rects.get(index)
          if (!rect) {
            rect = { sx: (index % 67) * 16, sy: Math.floor(index / 67) * 16, sw: 16, sh: 16 }
            rects.set(index, rect)
          }
          return rect
        },
      }
    })
    frontHeads = pending
    pending.catch(() => {
      if (frontHeads === pending) frontHeads = undefined
    })
  }
  return frontHeads
}

/** Decode Quest's front/profile head atlases once, using the canonical 67-column, 16px geometry. */
export function loadHeads(): Promise<RemyHeads> {
  if (!heads) {
    const pending = Promise.all([loadFrontHeads(), decode(questSrc('sides.webp'))]).then(([front, side]) => ({ ...front, side }))
    heads = pending
    pending.catch(() => {
      if (heads === pending) heads = undefined
    })
  }
  return heads
}

/** Canonical portrait flavour and sunglasses flag, using the same catalogue request as palettes and the Cabald roster. */
export async function loadRemyMeta(idx: number): Promise<{ epithet: string; shades: boolean }> {
  const { rows } = await loadCatalogue()
  const row = rows[normalize(idx)]
  return { epithet: row[10], shades: Boolean(row[7]) }
}
