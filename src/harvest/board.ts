/**
 * Remy's Harvest leaderboard client for workers/remy-harvest (/api/harvest/*; `npm run dev` proxies it to
 * `wrangler dev` on :8789). Names are screened server-side by clef-flash; this only reports the outcome.
 */

export interface Entry {
  rank: number
  name: string
  score: number
  caught: number
  level: number
}

export type SubmitError = 'name_rejected' | 'slow_down' | 'invalid' | 'unavailable' | 'network'
export type SubmitResult = { ok: true; rank: number; best: number; top: Entry[] } | { ok: false; error: SubmitError }

const ERRORS: Record<SubmitError, true> = { name_rejected: true, slow_down: true, invalid: true, unavailable: true, network: true }

/** Same grouping as the worker's nameKey: case and separators don't make a new player. */
export const nameKey = (name: string) => name.toLowerCase().replace(/[\s_.'-]+/g, '')

function entries(v: unknown): Entry[] | null {
  return Array.isArray(v) ? v.filter((e): e is Entry => !!e && typeof e.name === 'string' && typeof e.score === 'number') : null
}

export async function fetchTop(): Promise<Entry[] | null> {
  try {
    const res = await fetch('/api/harvest/leaderboard', { cache: 'no-store' })
    if (!res.ok) return null
    const body: unknown = await res.json()
    return body && typeof body === 'object' && 'top' in body ? entries(body.top) : null
  } catch {
    return null
  }
}

export async function submitScore(run: { name: string; score: number; caught: number; level: number; sisters: number }): Promise<SubmitResult> {
  let res: Response
  let body: unknown
  try {
    res = await fetch('/api/harvest/scores', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(run),
    })
    body = await res.json()
  } catch {
    return { ok: false, error: 'network' }
  }
  if (!body || typeof body !== 'object') return { ok: false, error: 'unavailable' }
  if (res.ok && 'rank' in body && typeof body.rank === 'number' && 'best' in body && typeof body.best === 'number' && 'top' in body) {
    return { ok: true, rank: body.rank, best: body.best, top: entries(body.top) ?? [] }
  }
  const error = 'error' in body && typeof body.error === 'string' && body.error in ERRORS ? (body.error as SubmitError) : 'unavailable'
  return { ok: false, error }
}
