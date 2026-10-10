/**
 * The shared "your Remy" preference for every classic game: one player Remy (always a non-bald original art index) and
 * one last-entered name, persisted at `remygames.player.v1` as `{ remy, name }`.
 *
 * The synchronous API can never wait for the Cabald roster (Quest's `art.json`), so it works in two phases:
 * - Before the roster is known the player Remy is the canonical civilian baseline
 *   ({@link BASELINE_REMY}, Prof. Gwei, known non-bald from the catalogue). Saved picks are never trusted before validation.
 * - Once the cached roster arrives (started on the first {@link getGamesPlayer} / {@link useGamesPlayer}), a fresh
 *   install is seeded with a random non-bald Remy and saved, and a saved choice that turns out bald (hand-edited
 *   storage) is replaced the same way. Subscribers ({@link useGamesPlayer}) re-render; games reading
 *   {@link getGamesPlayer} once at start keep the provisional value for that session.
 * If the roster cannot be loaded nothing is faked: the safe baseline keeps working and the next hook mount or
 * choice retries. Bald choices are never applied; a choice made before the roster is known is validated when it arrives.
 */
import { useEffect, useSyncExternalStore } from 'react'
import { loadGame, saveGame } from './storage'
import { REMY_COUNT, isRemyIndex, loadCabald, mulberry32 } from './remy'

/** The shared player preference: an original art index (`0 … REMY_COUNT - 1`, never bald) and the last name entered. */
export type GamesPlayer = { remy: number; name: string }

const STORE_ID = 'player'
const DEFAULT_NAME = 'Anonymous'
const MAX_NAME = 32

/** Canonical civilian (Prof. Gwei, art row 46, bald flag 0): the guaranteed non-bald Remy used until the roster is known. */
const BASELINE_REMY = 46

/** Persisted player shape; provisional saves use the known-safe civilian baseline. */
type Saved = GamesPlayer

const isSaved = (v: unknown): v is Saved => {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return typeof o.name === 'string' && typeof o.remy === 'number'
}

let state: GamesPlayer | undefined
/** True once `state.remy` is a real choice (saved, picked or seeded) rather than the provisional baseline. */
let fixed = false
/** True once the roster has confirmed `state.remy` (or replaced it). */
let hydrated = false
let hydrating = false
let baldSet: Set<number> | undefined
let rosterLoad: Promise<Set<number>> | undefined
let choiceSeq = 0
let savedChoice: number | undefined
const listeners = new Set<() => void>()

function cleanName(name: string): string {
  return name.trim().slice(0, MAX_NAME).trim() || DEFAULT_NAME
}

function current(): GamesPlayer {
  if (state) return state
  const saved = loadGame<Saved | null>(STORE_ID, null, (v): v is Saved => isSaved(v))
  savedChoice = saved?.remy != null && isRemyIndex(saved.remy) ? saved.remy : undefined
  fixed = false
  state = { remy: BASELINE_REMY, name: cleanName(saved?.name ?? DEFAULT_NAME) }
  hydrated = false
  hydrate()
  return state
}

function persist(): void {
  if (state) saveGame<Saved>(STORE_ID, { remy: fixed ? state.remy : savedChoice ?? BASELINE_REMY, name: state.name })
}

function emit(): void {
  for (const cb of [...listeners]) cb()
}

/** The Cabald roster as a set, shared and cached for the session; a failed load is evicted so the next call retries. */
function roster(): Promise<Set<number>> {
  if (baldSet) return Promise.resolve(baldSet)
  if (!rosterLoad) {
    const p = loadCabald().then((list) => {
      baldSet = new Set(list)
      return baldSet
    })
    rosterLoad = p
    p.catch(() => {
      if (rosterLoad === p) rosterLoad = undefined
    })
  }
  return rosterLoad
}

function seedRemy(bald: Set<number>): number {
  const rand = mulberry32((Math.random() * 0x100000000) ^ Date.now())
  for (let i = 0; i < 64; i++) {
    const idx = Math.floor(rand() * REMY_COUNT)
    if (!bald.has(idx)) return idx
  }
  for (let i = 0; i < REMY_COUNT; i++) if (!bald.has(i)) return i
  return BASELINE_REMY
}

/** Validate the saved choice or seed a random civilian once the roster is known. Never blocks play; retried by later callers on failure. */
function hydrate(): void {
  if (hydrated || hydrating) return
  hydrating = true
  roster()
    .then((bald) => {
      hydrated = true
      const cur = current()
      if (fixed && !bald.has(cur.remy)) return
      state = { ...cur, remy: savedChoice !== undefined && !bald.has(savedChoice) ? savedChoice : seedRemy(bald) }
      fixed = true
      savedChoice = undefined
      persist()
      emit()
    })
    .catch(() => {
      // Offline or bad catalogue: keep the saved/baseline Remy; a later mount or pick retries.
    })
    .finally(() => {
      hydrating = false
    })
}

function apply(idx: number): void {
  if (baldSet?.has(idx)) return
  const cur = current()
  fixed = true
  savedChoice = undefined
  hydrated = true
  if (cur.remy === idx) {
    persist()
    return
  }
  state = { ...cur, remy: idx }
  persist()
  emit()
}

/**
 * The shared player preference, synchronously. `remy` is always known non-bald: the canonical civilian baseline
 * until the roster validates the saved choice or seeds a random one (see the module notes). The first call
 * starts that background hydration. The returned object is replaced (never mutated) on every change.
 */
export function getGamesPlayer(): GamesPlayer {
  return current()
}

/**
 * Choose the player Remy. Ignores values that are not integers in `0 … REMY_COUNT - 1` and any bald Remy. When the
 * roster is not known yet the choice is validated as soon as it arrives (the latest pending choice wins; a failed load
 * drops it). Persisted and broadcast to {@link useGamesPlayer} subscribers on success.
 */
export function setGamesPlayerRemy(idx: number): void {
  if (!isRemyIndex(idx)) return
  current()
  if (baldSet) {
    apply(idx)
    return
  }
  const seq = ++choiceSeq
  roster().then(
    (bald) => {
      if (seq === choiceSeq && !bald.has(idx)) apply(idx)
    },
    () => {},
  )
}

/** Store the shared last-entered name (trimmed, capped at 32 characters, blank becomes "Anonymous"). Persists and broadcasts. */
export function setGamesPlayerName(name: string): void {
  const next = cleanName(name)
  const cur = current()
  if (cur.name === next) return
  state = { ...cur, name: next }
  persist()
  emit()
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => void listeners.delete(cb)
}

/**
 * React binding for the shared player.
 * @returns the live `player` plus the stable `setRemy` ({@link setGamesPlayerRemy}) and `setName` ({@link setGamesPlayerName}) actions.
 * Mounting retries roster hydration if an earlier attempt failed.
 */
export function useGamesPlayer(): { player: GamesPlayer; setRemy: (idx: number) => void; setName: (name: string) => void } {
  const player = useSyncExternalStore(subscribe, current, current)
  useEffect(() => hydrate(), [])
  return { player, setRemy: setGamesPlayerRemy, setName: setGamesPlayerName }
}
