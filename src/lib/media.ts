/**
 * Art served from R2 through the remy-media Worker at /media/* (workers/remy-media). Every key is immutable: Remy
 * variants are keyed by recipe version, Quest art by a content hash of media/quest, so browsers and the edge cache
 * them for a year and never revalidate. `npm run media:sync` builds and uploads them; `vite dev` serves them locally.
 * Shared by the OS app, Remy Quest and scripts/media.mjs (plain TS: no imports, no enums).
 */

/** Bump when the resize recipe in scripts/media.mjs changes, so every cached variant is re-fetched. */
export const REMY_RECIPE = 'v1'
/** Square widths; 600 is the untouched original. */
export const REMY_WIDTHS = [128, 320, 600] as const
export type RemyWidth = (typeof REMY_WIDTHS)[number]

export const remyKey = (idx: number, width: RemyWidth) => `remy/${REMY_RECIPE}/${width}/${idx}.webp`
export const remySrc = (idx: number, width: RemyWidth = 600) => `/media/${remyKey(idx, width)}`

/**
 * `<img>` attributes for a Remy: `sizes` is the rendered CSS width (e.g. `48px`, `(max-width: 720px) 90vw, 400px`);
 * the browser picks the smallest variant that covers it at the device pixel ratio.
 */
export function remyImg(idx: number, sizes: string) {
  return {
    src: remySrc(idx, 320),
    srcSet: REMY_WIDTHS.map((w) => `${remySrc(idx, w)} ${w}w`).join(', '),
    sizes,
  }
}

/** Remy Quest art (media/quest/<path>) under its content-hash version. */
export const questSrc = (path: string) => `/media/quest/${__QUEST_MEDIA__}/${path}`
