/** Game rules data: types, moves, Remy "species" (one per art index), items, stat math. Pure; no DOM. */
import { art } from './art'

export const REMY_COUNT = 4490
export const artSrc = (idx: number) => `/images/Character${idx}.webp`

export type RType = 'BULL' | 'BEAR' | 'WHALE' | 'DEGEN' | 'MEME'
export const TYPES: RType[] = ['BULL', 'BEAR', 'WHALE', 'DEGEN']
export const TYPE_COLOR: Record<RType, string> = {
  BULL: '#27c46b',
  BEAR: '#ec4a4a',
  WHALE: '#2f8cff',
  DEGEN: '#b35cff',
  MEME: '#f2b43a',
}
export const TYPE_BLURB: Record<RType, string> = {
  BULL: 'Relentless optimists. Strong vs BEAR, weak vs WHALE.',
  BEAR: 'Cold-blooded sellers. Strong vs DEGEN, weak vs BULL.',
  WHALE: 'Deep pockets, big splashes. Strong vs BULL, weak vs DEGEN.',
  DEGEN: '100x energy. Strong vs WHALE, weak vs BEAR.',
  MEME: 'Pure vibes. Neutral against everything.',
}

/** BULL > BEAR > DEGEN > WHALE > BULL. MEME is neutral. */
const BEATS: Partial<Record<RType, RType>> = { BULL: 'BEAR', BEAR: 'DEGEN', DEGEN: 'WHALE', WHALE: 'BULL' }
export function effectiveness(move: RType, target: RType): number {
  if (move === 'MEME' || target === 'MEME') return 1
  if (BEATS[move] === target) return 2
  if (BEATS[target] === move) return 0.5
  return 1
}
/** The type that beats `t` (used by the rival to counter-pick). */
export const counterOf = (t: RType): RType => (Object.keys(BEATS) as RType[]).find((k) => BEATS[k] === t) ?? 'MEME'

export type Effect =
  | { kind: 'stat'; who: 'self' | 'foe'; stat: StatKey; stages: number }
  | { kind: 'heal'; frac: number }
  | { kind: 'recoil'; frac: number }
  | { kind: 'drain'; frac: number }

export type MoveId =
  | 'shill'
  | 'ratio'
  | 'flash_loan'
  | 'fud'
  | 'paper_hands'
  | 'diamond_hands'
  | 'pump_it'
  | 'hodl'
  | 'green_candle'
  | 'bull_run'
  | 'to_the_moon'
  | 'red_candle'
  | 'wick_hunt'
  | 'capitulation'
  | 'splash'
  | 'yield_farm'
  | 'tsunami_sell'
  | 'ape_in'
  | 'leverage'
  | 'rug_pull'

export interface Move {
  name: string
  type: RType
  power: number // 0 = status move
  acc: number // 0..100
  pp: number
  priority?: number
  highCrit?: boolean
  effect?: Effect
  desc: string
}

export const MOVES: Record<MoveId, Move> = {
  shill: { name: 'Shill', type: 'MEME', power: 40, acc: 100, pp: 35, desc: 'Relentlessly shills the target.' },
  ratio: { name: 'Ratio', type: 'MEME', power: 65, acc: 95, pp: 20, desc: 'Posts a reply so good it hurts.' },
  flash_loan: {
    name: 'Flash Loan',
    type: 'MEME',
    power: 40,
    acc: 100,
    pp: 25,
    priority: 1,
    desc: 'Borrow, strike, repay. Usually moves first.',
  },
  fud: {
    name: 'FUD',
    type: 'MEME',
    power: 0,
    acc: 100,
    pp: 30,
    effect: { kind: 'stat', who: 'foe', stat: 'atk', stages: -1 },
    desc: 'Spreads fear. Lowers the foe\u2019s ATTACK.',
  },
  paper_hands: {
    name: 'Paper Hands',
    type: 'MEME',
    power: 0,
    acc: 100,
    pp: 30,
    effect: { kind: 'stat', who: 'foe', stat: 'def', stages: -1 },
    desc: 'Makes the foe fold. Lowers its DEFENSE.',
  },
  diamond_hands: {
    name: 'Diamond Hands',
    type: 'MEME',
    power: 0,
    acc: 100,
    pp: 20,
    effect: { kind: 'stat', who: 'self', stat: 'def', stages: 2 },
    desc: 'Refuses to sell. Sharply raises DEFENSE.',
  },
  pump_it: {
    name: 'Pump It',
    type: 'MEME',
    power: 0,
    acc: 100,
    pp: 20,
    effect: { kind: 'stat', who: 'self', stat: 'atk', stages: 2 },
    desc: 'Gets hyped. Sharply raises ATTACK.',
  },
  hodl: {
    name: 'HODL',
    type: 'MEME',
    power: 0,
    acc: 100,
    pp: 8,
    effect: { kind: 'heal', frac: 0.5 },
    desc: 'Holds on for dear life. Restores half of max HP.',
  },
  green_candle: { name: 'Green Candle', type: 'BULL', power: 45, acc: 100, pp: 30, desc: 'A big green candle rams the foe.' },
  bull_run: { name: 'Bull Run', type: 'BULL', power: 75, acc: 100, pp: 15, desc: 'Charges in with unstoppable momentum.' },
  to_the_moon: { name: 'To the Moon', type: 'BULL', power: 110, acc: 85, pp: 5, desc: 'Launches the foe into orbit. Might miss.' },
  red_candle: { name: 'Red Candle', type: 'BEAR', power: 45, acc: 100, pp: 30, desc: 'A red candle crashes down on the foe.' },
  wick_hunt: {
    name: 'Wick Hunt',
    type: 'BEAR',
    power: 70,
    acc: 100,
    pp: 15,
    highCrit: true,
    desc: 'Hunts stop losses. High critical-hit chance.',
  },
  capitulation: { name: 'Capitulation', type: 'BEAR', power: 110, acc: 85, pp: 5, desc: 'Total market surrender. Might miss.' },
  splash: { name: 'Splash', type: 'WHALE', power: 45, acc: 100, pp: 30, desc: 'A surprisingly effective splash.' },
  yield_farm: {
    name: 'Yield Farm',
    type: 'WHALE',
    power: 65,
    acc: 100,
    pp: 15,
    effect: { kind: 'drain', frac: 0.5 },
    desc: 'Restores HP equal to half the damage dealt.',
  },
  tsunami_sell: { name: 'Tsunami Sell', type: 'WHALE', power: 100, acc: 90, pp: 5, desc: 'Dumps a wall of coins on the foe.' },
  ape_in: { name: 'Ape In', type: 'DEGEN', power: 45, acc: 100, pp: 30, desc: 'Apes in without reading anything.' },
  leverage: {
    name: '100x Leverage',
    type: 'DEGEN',
    power: 95,
    acc: 100,
    pp: 10,
    effect: { kind: 'recoil', frac: 0.25 },
    desc: 'Takes 1/4 of the damage dealt as recoil.',
  },
  rug_pull: { name: 'Rug Pull', type: 'DEGEN', power: 120, acc: 80, pp: 5, desc: 'Pulls the rug out from under the foe. Might miss.' },
}

/** Level → move learned, per type. Type moves arrive at Lv5 so early fights (and the first rival) are Shill slugfests. */
const LEARN: Record<Exclude<RType, 'MEME'>, [number, MoveId][]> = {
  BULL: [
    [1, 'shill'],
    [1, 'pump_it'],
    [5, 'green_candle'],
    [8, 'flash_loan'],
    [11, 'bull_run'],
    [14, 'fud'],
    [17, 'to_the_moon'],
    [20, 'hodl'],
  ],
  BEAR: [
    [1, 'shill'],
    [1, 'fud'],
    [5, 'red_candle'],
    [8, 'flash_loan'],
    [11, 'wick_hunt'],
    [14, 'paper_hands'],
    [17, 'capitulation'],
    [20, 'hodl'],
  ],
  WHALE: [
    [1, 'shill'],
    [1, 'diamond_hands'],
    [5, 'splash'],
    [8, 'ratio'],
    [11, 'yield_farm'],
    [14, 'fud'],
    [17, 'tsunami_sell'],
    [20, 'hodl'],
  ],
  DEGEN: [
    [1, 'shill'],
    [1, 'paper_hands'],
    [5, 'ape_in'],
    [8, 'flash_loan'],
    [11, 'leverage'],
    [14, 'pump_it'],
    [17, 'rug_pull'],
    [20, 'hodl'],
  ],
}

export type StatKey = 'hp' | 'atk' | 'def' | 'spd'
export type Stats = Record<StatKey, number>

export interface Species {
  idx: number
  type: Exclude<RType, 'MEME'>
  base: Stats
  baseExp: number
  catchRate: number // 0..1
}

function hash(n: number): number {
  let x = (n + 0x9e3779b9) | 0
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b)
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35)
  return (x ^ (x >>> 16)) >>> 0
}
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Story Remys with fixed types so the cast feels intentional. */
const TYPE_OVERRIDE: Record<number, Exclude<RType, 'MEME'>> = {
  16: 'BULL',
  9: 'BEAR',
  13: 'WHALE',
  54: 'DEGEN',
  2002: 'BULL',
  // Gym leader MAXI: bull-heavy with a whale opener.
  2081: 'WHALE',
  2004: 'BULL',
  3434: 'BULL',
  // RUG LORD: degens and a bear.
  2067: 'DEGEN',
  45: 'BEAR',
  2: 'DEGEN',
}

const CACHE = new Map<number, Species>()

/** A story seed keeps its authored type when the cast resolver swaps a different Remy into its role. */
function inheritType(seed: number, idx: number) {
  const t = TYPE_OVERRIDE[seed]
  if (idx === seed || !t || TYPE_OVERRIDE[idx] === t) return
  TYPE_OVERRIDE[idx] = t
  CACHE.delete(idx)
}

/** Bald ⇔ Cabald: the catalogue's bald flag is the membership roll. */
export const isCabald = (idx: number) => art.get(idx).bald

/** Remys a trainer can ever mint: the whole collection minus the Cabald, who only fight for their bosses. */
export const mintableCount = () => REMY_COUNT - art.baldList().length

/** Deterministic Cabald member for a story seed, drawn from whoever the catalogue says is bald. */
export function cabaldRemy(seed: number): number {
  const members = art.baldList()
  if (!members.length || (seed >= 0 && seed < REMY_COUNT && isCabald(seed))) return seed
  const idx = members[hash(seed ^ 0x0cab41d) % members.length]
  inheritType(seed, idx)
  return idx
}

/** A non-member for a story seed: the seed itself, or the next Remy up the collection with hair. */
export function civRemy(seed: number): number {
  for (let i = 0; i < REMY_COUNT; i++) {
    const idx = (seed + i) % REMY_COUNT
    if (isCabald(idx)) continue
    inheritType(seed, idx)
    return idx
  }
  return seed
}

export function species(idx: number): Species {
  const hit = CACHE.get(idx)
  if (hit) return hit
  const r = rng(hash(idx))
  const type = TYPE_OVERRIDE[idx] ?? art.get(idx).type
  // 300–340 total base stats, every stat at least 55.
  const w = [r() + 0.6, r() + 0.6, r() + 0.6, r() + 0.6]
  const sum = w.reduce((a, b) => a + b, 0)
  const pool = 80 + Math.floor(r() * 40)
  const base: Stats = {
    hp: 55 + Math.round((pool * w[0]) / sum),
    atk: 55 + Math.round((pool * w[1]) / sum),
    def: 55 + Math.round((pool * w[2]) / sum),
    spd: 55 + Math.round((pool * w[3]) / sum),
  }
  const s: Species = { idx, type, base, baseExp: 70 + Math.floor(r() * 30), catchRate: 0.45 + r() * 0.2 }
  CACHE.set(idx, s)
  return s
}

export interface Remy {
  idx: number
  level: number
  xp: number
  hp: number
  moves: { id: MoveId; pp: number }[]
  /** Golden (shiny) variant: gold frame, +10% stats. */
  gold?: boolean
  /** Original trainer = the player (for "caught" counting); trainer-owned Remys are never in the player's save. */
  caughtAt?: string
}

export const xpForLevel = (l: number) => (l <= 1 ? 0 : Math.floor(0.8 * l ** 3))

export function statsOf(r: Pick<Remy, 'idx' | 'level' | 'gold'>): Stats {
  const b = species(r.idx).base
  const g = r.gold ? 1.1 : 1
  const L = r.level
  return {
    hp: Math.floor(((2 * b.hp * L) / 100) * g) + L + 12,
    atk: Math.floor(((2 * b.atk * L) / 100) * g) + 6,
    def: Math.floor(((2 * b.def * L) / 100) * g) + 6,
    spd: Math.floor(((2 * b.spd * L) / 100) * g) + 6,
  }
}

export function learnset(idx: number) {
  return LEARN[species(idx).type]
}

/** Moves learned exactly at `level`. */
export function movesAt(idx: number, level: number): MoveId[] {
  return learnset(idx)
    .filter(([l]) => l === level)
    .map(([, m]) => m)
}

export function makeRemy(idx: number, level: number, gold = false): Remy {
  const known = learnset(idx)
    .filter(([l]) => l <= level)
    .map(([, m]) => m)
  const moves = known.slice(-4).map((id) => ({ id, pp: MOVES[id].pp }))
  const r: Remy = { idx, level, xp: xpForLevel(level), hp: 0, moves, gold }
  r.hp = statsOf(r).hp
  return r
}

/** Which move a Remy forgets to learn `id` (index), or -1 if it just appends. Weakest attack (status = 55) goes. */
export function forgetIndex(r: Remy, id: MoveId): number {
  if (r.moves.length < 4) return -1
  const score = (m: MoveId) => (MOVES[m].power || 55) + (m === 'hodl' ? 30 : 0)
  let worst = 0
  for (let i = 1; i < r.moves.length; i++) if (score(r.moves[i].id) < score(r.moves[worst].id)) worst = i
  return score(r.moves[worst].id) < score(id) || MOVES[id].power === 0 ? worst : -2 // -2 = don't learn
}

export const remyName = (r: { idx: number; gold?: boolean }) => `${r.gold ? 'GOLDEN ' : ''}REMY #${r.idx}`

export const expGain = (foe: Remy, trainer: boolean) =>
  Math.floor(((species(foe.idx).baseExp * foe.level) / 6) * (trainer ? 1.5 : 1) * (foe.gold ? 1.5 : 1))

export const stageMult = (s: number) => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s))

/** Random wild Remy of a weighted type (types rerolled from the whole collection). Cabald members never roam. */
export function randomRemyIdx(rand: () => number, weights: Partial<Record<RType, number>>, avoid: Set<number>): number {
  const entries = Object.entries(weights) as [RType, number][]
  const total = entries.reduce((a, [, w]) => a + w, 0)
  let pick = rand() * total
  let want: RType = entries[0][0]
  for (const [t, w] of entries) {
    pick -= w
    if (pick <= 0) {
      want = t
      break
    }
  }
  for (let i = 0; i < 200; i++) {
    const idx = Math.floor(rand() * REMY_COUNT)
    if (!avoid.has(idx) && !isCabald(idx) && species(idx).type === want) return idx
  }
  // A depleted pool (or an unlucky RNG) must never leak a story-reserved Remy or a Cabald member.
  const start = Math.floor(rand() * REMY_COUNT)
  let fallback = -1
  for (let offset = 0; offset < REMY_COUNT; offset++) {
    const idx = (start + offset) % REMY_COUNT
    if (avoid.has(idx) || isCabald(idx)) continue
    if (species(idx).type === want) return idx
    if (fallback < 0) fallback = idx
  }
  if (fallback >= 0) return fallback
  throw new Error('No wild Remys remain outside the reserved collection and the Cabald')
}

export type ItemId = 'wallet' | 'ledger' | 'hopium' | 'max_hopium' | 'seed' | 'mempool'
export interface Item {
  name: string
  price: number
  desc: string
  kind: 'ball' | 'heal' | 'revive' | 'repel'
  amount?: number
  ballMult?: number
}
export const ITEMS: Record<ItemId, Item> = {
  wallet: { name: 'Cold Wallet', price: 200, kind: 'ball', ballMult: 1, desc: 'Mints a wild Remy. Weaken it first!' },
  ledger: { name: 'Ledger Pro', price: 600, kind: 'ball', ballMult: 1.8, desc: 'Premium cold storage. Better mint chance.' },
  hopium: { name: 'Hopium', price: 300, kind: 'heal', amount: 30, desc: 'A whiff of hope. Restores 30 HP.' },
  max_hopium: { name: 'Max Hopium', price: 800, kind: 'heal', amount: 999, desc: 'Bottled onchain summer. Fully restores HP.' },
  seed: { name: 'Seed Phrase', price: 1500, kind: 'revive', desc: 'Revives a fainted Remy at half its max HP.' },
  mempool: { name: 'Private Mempool', price: 350, kind: 'repel', amount: 120, desc: 'Hides you from wild Remys for 120 grass steps.' },
}
export const ITEM_ORDER: ItemId[] = ['wallet', 'ledger', 'hopium', 'max_hopium', 'seed', 'mempool']
