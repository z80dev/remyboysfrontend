import { ITEMS, type ItemId, MOVES, type Remy, remyName, statsOf } from './data'
import type { Dir } from './types'

const SAVE_KEY = 'remyquest.save.v1'

export interface SaveState {
  name: string
  map: string
  x: number
  y: number
  dir: Dir
  party: Remy[]
  storage: Remy[]
  bag: Partial<Record<ItemId, number>>
  money: number
  /** Story flags, defeated trainers (`t:<id>`), picked-up items (`i:<id>`). */
  flags: Record<string, true>
  seen: number[]
  caught: number[]
  /** Where a blackout sends you. */
  respawn: { map: string; x: number; y: number }
  playMs: number
  starter?: number
}

export function newGame(name: string): SaveState {
  return {
    name,
    map: 'genesis',
    x: 5,
    y: 6,
    dir: 'down',
    party: [],
    storage: [],
    bag: { hopium: 2 },
    money: 3000,
    flags: {},
    seen: [],
    caught: [],
    respawn: { map: 'genesis', x: 5, y: 6 },
    playMs: 0,
  }
}

export let S: SaveState = newGame('REMY')
export const setState = (s: SaveState) => {
  S = s
}

export function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null
}
export function loadSave(): SaveState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as SaveState
    // Restore awards omitted by earlier story versions without changing progress.
    if (s.starter !== undefined || s.party.length) s.flags.dex = true
    if (s.flags.rug) s.flags.badge_rug = true
    return s
  } catch {
    return null
  }
}
export function save() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(S))
}
export function wipeSave() {
  localStorage.removeItem(SAVE_KEY)
}

export function markSeen(idx: number) {
  if (!S.seen.includes(idx)) S.seen.push(idx)
}
export function markCaught(idx: number) {
  markSeen(idx)
  if (!S.caught.includes(idx)) S.caught.push(idx)
}

export function addItem(id: ItemId, n = 1) {
  S.bag[id] = (S.bag[id] ?? 0) + n
}
export function takeItem(id: ItemId) {
  const n = S.bag[id] ?? 0
  if (n <= 0) return false
  if (n === 1) delete S.bag[id]
  else S.bag[id] = n - 1
  return true
}

/** Adds a caught Remy to the party (or cold storage when full). Returns where it went. */
export function receiveRemy(r: Remy, where: string): 'party' | 'storage' {
  r.caughtAt = where
  markCaught(r.idx)
  if (S.party.length < 6) {
    S.party.push(r)
    return 'party'
  }
  S.storage.push(r)
  return 'storage'
}

export function healParty() {
  for (const r of S.party) {
    r.hp = statsOf(r).hp
    for (const m of r.moves) m.pp = MOVES[m.id].pp
  }
}

export const firstAlive = () => S.party.findIndex((r) => r.hp > 0)
export const partyAlive = () => S.party.some((r) => r.hp > 0)

/** Applies a healing/revive item to `r`. Returns the result line, or null when it would have no effect. */
export function useItemOn(id: ItemId, r: Remy): string | null {
  const item = ITEMS[id]
  const max = statsOf(r).hp
  const name = remyName(r)
  if (item.kind === 'revive') {
    if (r.hp > 0) return null
    r.hp = Math.floor(max / 2)
    return `${name} was restored from its *Seed Phrase*!`
  }
  if (item.kind === 'heal') {
    if (r.hp <= 0 || r.hp >= max) return null
    const before = r.hp
    r.hp = Math.min(max, r.hp + (item.amount ?? 0))
    return `${name} recovered *${r.hp - before} HP*!`
  }
  return null
}
