/**
 * Typed, never-throwing persistence for classic games. Every game owns one JSON blob at `remygames.<id>.v1`.
 * A sandboxed embed or private window may deny localStorage (reads and writes throw): the blob then lives in memory
 * for the session, so games keep working and simply do not persist.
 */

const ID = /^[a-z0-9][a-z0-9-]*$/

/** Values held when localStorage refused them (newest wins over whatever the real store still has). */
const memory = new Map<string, string>()

/** A runtime check that narrows untrusted parsed JSON to `T`. */
export type Guard<T> = (value: unknown) => value is T

/**
 * The localStorage key for a game: `remygames.<id>.v1`.
 * @param id lowercase letters, digits and dashes, starting with a letter or digit (e.g. `minesweeper`).
 * @throws RangeError when `id` does not match that shape.
 */
export function gameKey(id: string): string {
  if (!ID.test(id)) throw new RangeError(`Invalid game id: ${id}`)
  return `remygames.${id}.v1`
}

function readRaw(key: string): string | null {
  const held = memory.get(key)
  if (held !== undefined) return held
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * Read a game's saved value. Returns `fallback` when nothing is saved, the JSON is corrupt, storage is denied or the
 * `valid` guard rejects the parsed value (so a stale or hand-edited blob can never reach game code).
 * @param id game id, see {@link gameKey}.
 * @param fallback value returned instead of a missing/invalid save (returned by reference, not cloned).
 * @param valid optional guard for the parsed JSON; without it the parsed value is trusted as `T`.
 */
export function loadGame<T>(id: string, fallback: T, valid?: Guard<T>): T {
  const raw = readRaw(gameKey(id))
  if (raw === null) return fallback
  try {
    const parsed: unknown = JSON.parse(raw)
    if (valid ? valid(parsed) : parsed !== undefined && parsed !== null) return parsed as T
  } catch {
    // Corrupt JSON: fall through to the fallback.
  }
  return fallback
}

/**
 * Save a game's value as JSON.
 * @returns `true` when it reached localStorage; `false` when it is only held in memory (storage denied/full) or
 * the value is not serializable.
 */
export function saveGame<T>(id: string, value: T): boolean {
  const key = gameKey(id)
  let json: string
  try {
    json = JSON.stringify(value)
  } catch {
    return false
  }
  if (json === undefined) return false
  try {
    localStorage.setItem(key, json)
    memory.delete(key)
    return true
  } catch {
    memory.set(key, json)
    return false
  }
}

/**
 * Read-modify-write helper: loads the save (or `fallback`), applies `update`, saves and returns the result.
 * @param update pure function from the current value to the next one.
 */
export function updateGame<T>(id: string, fallback: T, update: (current: T) => T, valid?: Guard<T>): T {
  const next = update(loadGame(id, fallback, valid))
  saveGame(id, next)
  return next
}

/** Delete a game's save (both localStorage and the in-memory copy). */
export function clearGame(id: string): void {
  const key = gameKey(id)
  memory.delete(key)
  try {
    localStorage.removeItem(key)
  } catch {
    // Storage denied: nothing persisted to remove.
  }
}
