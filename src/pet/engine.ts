/**
 * Remygotchi rules: a Remy as a virtual pet with real-time needs, daily care quests and a daily streak.
 * Pure and DOM-free. Times are epoch milliseconds; "days" are the player's LOCAL calendar days (`YYYY-MM-DD`).
 * Every action takes the save and `now`, catches the active pet up to `now` (needs keep draining while the tab is
 * closed, capped at {@link OFFLINE_CAP_H}), rolls the day over if needed, and returns a new save plus the events the
 * UI turns into speech bubbles, sounds and celebrations. The input save is never mutated.
 */

export const STATS = ['hunger', 'fun', 'energy', 'clean'] as const
export type Stat = (typeof STATS)[number]
export type Stats = Record<Stat, number>

export type HatId = keyof typeof HATS
export type RoomId = keyof typeof ROOMS
export type FoodId = keyof typeof FOODS
export type ItemId = FoodId | 'medicine' | 'freeze'
export type QuestKind = 'feed' | 'play' | 'win' | 'bath' | 'pet' | 'treat' | 'nap' | 'happy'
export type MiniGame = 'cups' | 'hilo'

export type Pet = {
  /** `t<tokenId>` for a wallet Remy, `a<artIndex>` for a stray. */
  id: string
  /** Original art index (`Character<idx>.webp`). */
  art: number
  /** Token id, for Remys adopted from the connected wallet. */
  token?: string
  name: string
  born: number
  stats: Stats
  health: number
  sick: boolean
  /** Messes on the floor, 0 … {@link MAX_POOPS}. */
  poops: number
  /** Awake hours since the last mess. */
  poopClock: number
  asleep: boolean
  xp: number
  hat: HatId | null
  room: RoomId
  /** Simulated up to this time. Pets not out of the house sit in daycare: frozen, no drain. */
  updated: number
  /** Pets that counted toward fun this hour (anti-farming), keyed by hour bucket. */
  pets: { hour: number; n: number }
}

export type Quest = { kind: QuestKind; goal: number; have: number }

export type Save = {
  v: 1
  pets: Pet[]
  /** Id of the pet out of the house (the only one that drains), or null before the first adoption. */
  active: string | null
  kernels: number
  items: Record<ItemId, number>
  /** Unlocked hats and rooms. */
  owned: string[]
  streak: { count: number; best: number; last: string | null; freezes: number }
  today: { date: string; quests: Quest[]; done: boolean; gift: boolean }
  life: { fed: number; games: number; wins: number; baths: number; days: number }
}

export type Mood = 'ecstatic' | 'happy' | 'okay' | 'sad' | 'miserable' | 'sick' | 'sleeping'

export type PetEvent =
  | { type: 'say'; text: string; tone: 'happy' | 'sad' | 'no' }
  | { type: 'ate'; food: FoodId }
  | { type: 'quest'; text: string; kernels: number }
  | { type: 'dayDone'; streak: number; kernels: number }
  | { type: 'milestone'; days: number; unlock?: string; freeze: boolean }
  | { type: 'level'; level: number; stage: string; grew: boolean }
  | { type: 'freezeUsed'; days: number }
  | { type: 'streakLost'; was: number }
  | { type: 'sick' }
  | { type: 'poop' }
  | { type: 'sleep' }
  | { type: 'wake' }
  | { type: 'kernels'; n: number }

export type Result = { save: Save; events: PetEvent[] }

export const MAX_STAT = 100
export const MAX_POOPS = 4
export const MAX_STRAYS = 3
export const MAX_FREEZES = 2
/** Longest absence that still drains; a month away costs the same as three days. */
export const OFFLINE_CAP_H = 72
const STEP_MS = 10 * 60_000
const HOUR = 3_600_000
const POOP_EVERY_H = 3
const PETS_PER_HOUR = 12

/** Drain per hour while awake; sleeping pets refill energy and drain the rest slowly. */
const AWAKE: Stats = { hunger: 6, fun: 5, energy: 4, clean: 3 }
const ASLEEP: Stats = { hunger: 3, fun: 1.5, energy: -14, clean: 1 }

export const FOODS = {
  corn: { name: 'Corn on the cob', emoji: '🌽', price: 0, hunger: 22, fun: 2, energy: 0, health: 1, treat: false },
  salad: { name: 'Garden salad', emoji: '🥗', price: 12, hunger: 20, fun: 0, energy: 2, health: 10, treat: false },
  ramen: { name: 'Ramen', emoji: '🍜', price: 18, hunger: 40, fun: 6, energy: 8, health: 2, treat: false },
  pizza: { name: 'Pizza', emoji: '🍕', price: 15, hunger: 34, fun: 12, energy: 0, health: -1, treat: true },
  candy: { name: 'Candy', emoji: '🍬', price: 6, hunger: 4, fun: 18, energy: 6, health: -4, treat: true },
  golden: { name: 'Golden corn', emoji: '🌽', price: 60, hunger: 30, fun: 30, energy: 30, health: 20, treat: true },
} as const

export const ITEMS: Record<'medicine' | 'freeze', { name: string; emoji: string; price: number; desc: string }> = {
  medicine: { name: 'Medicine', emoji: '💊', price: 25, desc: 'Cures a sick Remy' },
  freeze: { name: 'Streak Freeze', emoji: '🧊', price: 150, desc: `Saves your streak for one missed day (hold ${MAX_FREEZES})` },
}

/** `streak`: unlocked by reaching that many days in a row (best streak). `price`: bought with kernels. */
export const HATS = {
  bow: { name: 'Big Bow', price: 30 },
  beanie: { name: 'Beanie', price: 40 },
  chef: { name: 'Chef Hat', price: 50 },
  cowboy: { name: 'Cowboy Hat', price: 60 },
  witch: { name: 'Witch Hat', price: 70 },
  propeller: { name: 'Propeller Cap', price: 80 },
  santa: { name: 'Santa Hat', price: 90 },
  party: { name: 'Party Hat', streak: 3 },
  crown: { name: 'Crown', streak: 7 },
  halo: { name: 'Halo', streak: 14 },
  wizard: { name: 'Wizard Hat', streak: 30 },
  diamond: { name: 'Diamond Crown', streak: 100 },
} as const satisfies Record<string, { name: string; price?: number; streak?: number }>

export const ROOMS = {
  bedroom: { name: 'Cozy Bedroom', price: 0 },
  cornfield: { name: 'Cornfield', price: 100 },
  beach: { name: 'Base Beach', price: 120 },
  haunted: { name: 'Haunted Mansion', price: 80 },
  arcade: { name: 'Arcade', price: 150 },
  moon: { name: 'The Moon', streak: 50 },
} as const satisfies Record<string, { name: string; price?: number; streak?: number }>

export type Cosmetic = { name: string; price?: number; streak?: number }
/** Hats and rooms in one lookup, for code that handles any unlockable by id. */
export const COSMETICS: Record<string, Cosmetic> = { ...HATS, ...ROOMS }

/** Streak days that pay out: an unlock (if any) and a Streak Freeze every week. */
export const MILESTONES = [3, 7, 14, 21, 30, 50, 100] as const

const QUESTS: Record<QuestKind, { goal: number; text: (n: number) => string }> = {
  feed: { goal: 3, text: (n) => `Feed your Remy ${n} times` },
  play: { goal: 2, text: (n) => `Play ${n} mini-games` },
  win: { goal: 1, text: () => 'Win a mini-game' },
  bath: { goal: 1, text: () => 'Give your Remy a bath' },
  pet: { goal: 10, text: (n) => `Pet your Remy ${n} times` },
  treat: { goal: 1, text: () => 'Share a treat (pizza, candy or golden corn)' },
  nap: { goal: 1, text: () => 'Tuck your Remy in for a nap' },
  happy: { goal: 1, text: () => 'Get every meter above 70%' },
}
const SIDE_QUESTS: QuestKind[] = ['play', 'win', 'bath', 'pet', 'treat', 'nap', 'happy']

export const QUEST_KERNELS = 15
export const STAGES = [
  { from: 1, name: 'Baby', scale: 0.72 },
  { from: 4, name: 'Kid', scale: 0.82 },
  { from: 8, name: 'Teen', scale: 0.91 },
  { from: 15, name: 'Adult', scale: 1 },
  { from: 25, name: 'Legend', scale: 1 },
] as const

const NAMES = [
  'Biscuit', 'Nugget', 'Pickles', 'Mochi', 'Waffles', 'Sprout', 'Noodle', 'Bean', 'Pudding', 'Tater', 'Gizmo', 'Peanut',
  'Muffin', 'Dumpling', 'Kernel', 'Taco', 'Pixel', 'Bagel', 'Turbo', 'Sushi', 'Toast', 'Jelly', 'Pebble', 'Chip',
]

// ─── Calendar ─────────────────────────────────────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar day of `ms` as `YYYY-MM-DD`. */
export function dayKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const dayUtc = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** Whole calendar days from `a` to `b` (DST-proof: counted on the date, not the clock). */
export function daysBetween(a: string, b: string): number {
  return Math.round((dayUtc(b) - dayUtc(a)) / 86_400_000)
}

export function addDays(key: string, n: number): string {
  const d = new Date(dayUtc(key) + n * 86_400_000)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** 22:00–07:00 local: awake Remys tire twice as fast. */
export const isNight = (ms: number) => {
  const h = new Date(ms).getHours()
  return h >= 22 || h < 7
}

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/** The day's three quests: always feeding, plus two side quests seeded by the date (everyone gets the same ones). */
export function questsFor(date: string): Quest[] {
  let seed = hash(date)
  const pool = SIDE_QUESTS.slice()
  const out: Quest[] = [{ kind: 'feed', goal: QUESTS.feed.goal, have: 0 }]
  for (let i = 0; i < 2; i++) {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0
    const [kind] = pool.splice(seed % pool.length, 1)
    out.push({ kind, goal: QUESTS[kind].goal, have: 0 })
  }
  return out
}

export const questText = (q: Quest) => QUESTS[q.kind].text(q.goal)

// ─── Levels ───────────────────────────────────────────────────────────────────────────────────────────────────

/** Total XP needed to reach `level` (level 1 is free; each level costs 10 more than the last, from 30). */
export const xpFor = (level: number) => 20 * (level - 1) + 5 * (level - 1) * level

export function levelInfo(xp: number) {
  let level = 1
  while (xpFor(level + 1) <= xp) level++
  const stage = [...STAGES].reverse().find((s) => level >= s.from) ?? STAGES[0]
  const base = xpFor(level)
  return { level, stage: stage.name, scale: stage.scale, into: xp - base, need: xpFor(level + 1) - base }
}

// ─── Derived state ────────────────────────────────────────────────────────────────────────────────────────────

const clamp = (n: number) => Math.max(0, Math.min(MAX_STAT, n))

export function mood(p: Pet): Mood {
  if (p.asleep) return 'sleeping'
  if (p.sick) return 'sick'
  const care = (p.stats.hunger + p.stats.fun + p.stats.energy + p.stats.clean) / 4
  const score = care * 0.7 + p.health * 0.3 - p.poops * 5
  if (score >= 80) return 'ecstatic'
  if (score >= 60) return 'happy'
  if (score >= 40) return 'okay'
  if (score >= 20) return 'sad'
  return 'miserable'
}

export type Need = 'hunger' | 'fun' | 'energy' | 'clean' | 'poop' | 'sick'
const LOW = 30

/** What the Remy is asking for right now, most urgent first. */
export function needs(p: Pet): Need[] {
  const out: Need[] = []
  if (p.sick) out.push('sick')
  const low = STATS.filter((s) => p.stats[s] < LOW).sort((a, b) => p.stats[a] - p.stats[b])
  for (const s of low) if (!(p.asleep && s === 'energy')) out.push(s)
  if (p.poops > 0) out.push('poop')
  return out
}

export type StreakState = 'safe' | 'risk' | 'none'
/** `safe`: today's quests are done. `risk`: a running streak ends at midnight unless today's quests get done. */
export function streakState(s: Save): StreakState {
  if (s.today.done) return 'safe'
  return s.streak.count > 0 ? 'risk' : 'none'
}

export const activePet = (s: Save): Pet | undefined => s.pets.find((p) => p.id === s.active)

/** Gift for opening today: grows with the streak, golden corn on every 7th day. */
export function giftFor(streak: number): { kernels: number; golden: boolean } {
  return { kernels: 10 + 4 * Math.min(streak, 10), golden: streak > 0 && streak % 7 === 0 }
}

export const dayBonus = (streak: number) => 30 + 5 * Math.min(streak, 10)

// ─── Save ─────────────────────────────────────────────────────────────────────────────────────────────────────

export function createSave(now: number): Save {
  const date = dayKey(now)
  return {
    v: 1,
    pets: [],
    active: null,
    kernels: 40,
    items: { corn: 0, salad: 1, ramen: 1, pizza: 2, candy: 2, golden: 0, medicine: 1, freeze: 0 },
    owned: ['bedroom'],
    streak: { count: 0, best: 0, last: null, freezes: 0 },
    today: { date, quests: questsFor(date), done: false, gift: false },
    life: { fed: 0, games: 0, wins: 0, baths: 0, days: 0 },
  }
}

/** Shape check for a parsed save; anything else falls back to a fresh save. */
export function isSave(value: unknown): value is Save {
  const s = value as Save
  return (
    !!s &&
    typeof s === 'object' &&
    s.v === 1 &&
    Array.isArray(s.pets) &&
    s.pets.every((p) => p && typeof p.id === 'string' && Number.isInteger(p.art) && typeof p.stats === 'object') &&
    typeof s.kernels === 'number' &&
    !!s.items &&
    Array.isArray(s.owned) &&
    !!s.streak &&
    typeof s.streak.count === 'number' &&
    !!s.today &&
    Array.isArray(s.today.quests)
  )
}

export const defaultName = (art: number) => NAMES[hash(`name${art}`) % NAMES.length]

// ─── Simulation ───────────────────────────────────────────────────────────────────────────────────────────────

/** Drain `p` from `p.updated` to `now` in ≤10-minute steps. Mutates `p`. */
function simulate(p: Pet, now: number, ev: PetEvent[]) {
  let t = Math.max(p.updated, now - OFFLINE_CAP_H * HOUR)
  while (t < now) {
    const step = Math.min(STEP_MS, now - t)
    const h = step / HOUR
    const rates = p.asleep ? ASLEEP : AWAKE
    const tired = !p.asleep && isNight(t) ? 2 : 1
    const sickMul = p.sick ? 1.5 : 1
    p.stats.hunger = clamp(p.stats.hunger - rates.hunger * h)
    p.stats.fun = clamp(p.stats.fun - rates.fun * h * sickMul)
    p.stats.energy = clamp(p.stats.energy - rates.energy * h * (rates.energy > 0 ? tired * sickMul : 1))
    p.stats.clean = clamp(p.stats.clean - (rates.clean + p.poops * 1.5) * h)

    if (!p.asleep && p.stats.hunger > 10) {
      p.poopClock += h
      if (p.poopClock >= POOP_EVERY_H) {
        p.poopClock = 0
        if (p.poops < MAX_POOPS) {
          p.poops++
          ev.push({ type: 'poop' })
        }
      }
    }

    const bad = p.stats.hunger < 15 || p.stats.clean < 15 || p.poops >= 3 || p.stats.energy < 5
    const great = STATS.every((s) => p.stats[s] >= 50) && p.poops === 0
    p.health = clamp(p.health + (bad ? -4 : great ? 3 : 0.5) * h)
    if (!p.sick && p.health < 35) {
      p.sick = true
      ev.push({ type: 'sick' })
    }

    if (!p.asleep && p.stats.energy <= 0) {
      p.asleep = true
      ev.push({ type: 'sleep' })
    } else if (p.asleep && p.stats.energy >= MAX_STAT) {
      p.asleep = false
      ev.push({ type: 'wake' })
    }
    t += step
  }
  p.updated = now
}

/** New local day: fresh quests and gift; a gap of more than one day spends freezes or ends the streak. */
function rollDay(s: Save, now: number, ev: PetEvent[]) {
  const date = dayKey(now)
  if (s.today.date === date) return
  const { streak } = s
  if (streak.last && streak.count > 0) {
    const missed = daysBetween(streak.last, date) - 1
    if (missed > 0 && streak.freezes >= missed) {
      streak.freezes -= missed
      streak.last = addDays(date, -1)
      ev.push({ type: 'freezeUsed', days: missed })
    } else if (missed > 0) {
      ev.push({ type: 'streakLost', was: streak.count })
      streak.count = 0
    }
  }
  s.today = { date, quests: questsFor(date), done: false, gift: false }
}

function addXp(s: Save, p: Pet, n: number, ev: PetEvent[]) {
  const before = levelInfo(p.xp)
  p.xp += n
  const after = levelInfo(p.xp)
  if (after.level > before.level) {
    s.kernels += 20
    ev.push({ type: 'level', level: after.level, stage: after.stage, grew: after.stage !== before.stage })
  }
}

function unlock(s: Save, id: string) {
  if (!s.owned.includes(id)) s.owned.push(id)
}

/** Advance quest `kind` by `n`; finishing all three secures the day and extends the streak. */
function progress(s: Save, p: Pet, kind: QuestKind, n: number, ev: PetEvent[], now: number) {
  for (const q of s.today.quests) {
    if (q.kind !== kind || q.have >= q.goal) continue
    q.have = Math.min(q.goal, q.have + n)
    if (q.have >= q.goal) {
      s.kernels += QUEST_KERNELS
      addXp(s, p, 10, ev)
      ev.push({ type: 'quest', text: questText(q), kernels: QUEST_KERNELS })
    }
  }
  if (s.today.done || !s.today.quests.every((q) => q.have >= q.goal)) return
  s.today.done = true
  const today = dayKey(now)
  const { streak } = s
  streak.count = streak.last === addDays(today, -1) ? streak.count + 1 : 1
  streak.last = today
  streak.best = Math.max(streak.best, streak.count)
  s.life.days++
  const bonus = dayBonus(streak.count)
  s.kernels += bonus
  addXp(s, p, 25, ev)
  ev.push({ type: 'dayDone', streak: streak.count, kernels: bonus })
  if ((MILESTONES as readonly number[]).includes(streak.count) || streak.count % 7 === 0) {
    const reward = Object.keys(COSMETICS).find((id) => COSMETICS[id].streak === streak.count)
    if (reward) unlock(s, reward)
    const freeze = streak.count % 7 === 0 && streak.freezes < MAX_FREEZES
    if (freeze) streak.freezes++
    ev.push({ type: 'milestone', days: streak.count, unlock: reward, freeze })
  }
}

/** The "happy" quest is a state, not an action: check it whenever the pet changes. */
function checkHappy(s: Save, p: Pet, ev: PetEvent[], now: number) {
  if (STATS.every((k) => p.stats[k] > 70) && p.health > 70) progress(s, p, 'happy', 1, ev, now)
}

type Draft = { s: Save; p: Pet | undefined; ev: PetEvent[] }

function act(save: Save, now: number, fn?: (d: Draft) => void): Result {
  const s = structuredClone(save)
  const ev: PetEvent[] = []
  const p = activePet(s)
  if (p) simulate(p, now, ev)
  rollDay(s, now, ev)
  const d = { s, p, ev }
  fn?.(d)
  if (p) checkHappy(s, p, ev, now)
  return { save: s, events: ev }
}

const say = (ev: PetEvent[], text: string, tone: 'happy' | 'sad' | 'no' = 'no') => ev.push({ type: 'say', text, tone })

// ─── Actions ──────────────────────────────────────────────────────────────────────────────────────────────────

/** Catch up to `now` (drain, day rollover) without doing anything. */
export const sync = (save: Save, now: number) => act(save, now)

/**
 * Adopt a Remy (or bring an already-adopted one out of daycare) and make it the active pet. Wallet Remys are keyed by
 * token; strays by art index and limited to {@link MAX_STRAYS}.
 */
export function adopt(save: Save, now: number, remy: { art: number; token?: string; name?: string }): Result {
  return act(save, now, ({ s, ev }) => {
    const id = remy.token !== undefined ? `t${remy.token}` : `a${remy.art}`
    const existing = s.pets.find((p) => p.id === id)
    if (!existing && remy.token === undefined && s.pets.filter((p) => p.token === undefined).length >= MAX_STRAYS) {
      say(ev, `The adoption center allows ${MAX_STRAYS} strays per home.`)
      return
    }
    if (existing) existing.updated = now
    else
      s.pets.push({
        id,
        art: remy.art,
        token: remy.token,
        name: (remy.name ?? defaultName(remy.art)).slice(0, 16),
        born: now,
        stats: { hunger: 70, fun: 80, energy: 90, clean: 100 },
        health: 100,
        sick: false,
        poops: 0,
        poopClock: 0,
        asleep: false,
        xp: 0,
        hat: null,
        room: 'bedroom',
        updated: now,
        pets: { hour: 0, n: 0 },
      })
    s.active = id
  })
}

/** Send the current pet to daycare (frozen) and bring `id` out. */
export function switchPet(save: Save, now: number, id: string): Result {
  return act(save, now, ({ s }) => {
    const next = s.pets.find((p) => p.id === id)
    if (!next) return
    next.updated = now
    s.active = id
  })
}

export function rename(save: Save, now: number, name: string): Result {
  return act(save, now, ({ p }) => {
    const clean = name.replace(/\s+/g, ' ').trim().slice(0, 16)
    if (p && clean) p.name = clean
  })
}

/** Return a pet to the adoption center. The next pet (if any) comes out of daycare. */
export function release(save: Save, now: number, id: string): Result {
  return act(save, now, ({ s }) => {
    s.pets = s.pets.filter((p) => p.id !== id)
    if (s.active === id) {
      s.active = s.pets[0]?.id ?? null
      if (s.pets[0]) s.pets[0].updated = now
    }
  })
}

export function feed(save: Save, now: number, food: FoodId): Result {
  return act(save, now, ({ s, p, ev }) => {
    if (!p) return
    const f = FOODS[food]
    if (p.asleep) return say(ev, 'Zzz… (sleeping)')
    if (f.price > 0 && (s.items[food] ?? 0) <= 0) return say(ev, `No ${f.name.toLowerCase()} left. Visit the shop!`)
    if (!f.treat && p.stats.hunger >= 96) return say(ev, "I'm stuffed!", 'no')
    if (f.price > 0) s.items[food]--
    p.stats.hunger = clamp(p.stats.hunger + f.hunger)
    p.stats.fun = clamp(p.stats.fun + f.fun)
    p.stats.energy = clamp(p.stats.energy + f.energy)
    p.health = clamp(p.health + f.health)
    s.life.fed++
    ev.push({ type: 'ate', food })
    addXp(s, p, f.treat ? 5 : 3, ev)
    progress(s, p, 'feed', 1, ev, now)
    if (f.treat) progress(s, p, 'treat', 1, ev, now)
  })
}

/** Can the active pet play right now? Returns the refusal, or undefined. */
export function cannotPlay(p: Pet): string | undefined {
  if (p.asleep) return 'Zzz… (sleeping)'
  if (p.sick) return "I don't feel well…"
  if (p.stats.energy < 15) return 'Too tired to play…'
  return undefined
}

export function finishGame(save: Save, now: number, won: boolean): Result {
  return act(save, now, ({ s, p, ev }) => {
    if (!p) return
    p.stats.fun = clamp(p.stats.fun + (won ? 30 : 18))
    p.stats.energy = clamp(p.stats.energy - 10)
    p.stats.hunger = clamp(p.stats.hunger - 5)
    const prize = won ? 15 : 5
    s.kernels += prize
    s.life.games++
    if (won) s.life.wins++
    ev.push({ type: 'kernels', n: prize })
    addXp(s, p, won ? 10 : 6, ev)
    progress(s, p, 'play', 1, ev, now)
    if (won) progress(s, p, 'win', 1, ev, now)
  })
}

export function bathe(save: Save, now: number): Result {
  return act(save, now, ({ s, p, ev }) => {
    if (!p) return
    if (p.asleep) return say(ev, 'Zzz… (sleeping)')
    p.stats.clean = MAX_STAT
    p.poops = 0
    p.poopClock = 0
    p.stats.fun = clamp(p.stats.fun - 3)
    s.life.baths++
    addXp(s, p, 4, ev)
    progress(s, p, 'bath', 1, ev, now)
  })
}

/** Scoop one mess off the floor. */
export function scoop(save: Save, now: number): Result {
  return act(save, now, ({ s, p }) => {
    if (!p || p.poops <= 0) return
    p.poops--
    p.stats.clean = clamp(p.stats.clean + 5)
    addXp(s, p, 1, [])
  })
}

export function toggleSleep(save: Save, now: number): Result {
  return act(save, now, ({ s, p, ev }) => {
    if (!p) return
    if (p.asleep) {
      p.asleep = false
      if (p.stats.energy < 60) {
        p.stats.fun = clamp(p.stats.fun - 5)
        say(ev, 'Grumble… five more minutes…', 'sad')
      }
      ev.push({ type: 'wake' })
      return
    }
    if (p.stats.energy >= 90) return say(ev, "I'm not sleepy!")
    p.asleep = true
    ev.push({ type: 'sleep' })
    addXp(s, p, 2, ev)
    progress(s, p, 'nap', 1, ev, now)
  })
}

export function medicine(save: Save, now: number): Result {
  return act(save, now, ({ s, p, ev }) => {
    if (!p) return
    if (!p.sick) return say(ev, "I'm not sick!")
    if ((s.items.medicine ?? 0) <= 0) return say(ev, 'No medicine left. Visit the shop!')
    s.items.medicine--
    p.sick = false
    p.health = Math.max(p.health, 60)
    addXp(s, p, 2, ev)
    say(ev, 'Much better!', 'happy')
  })
}

/** A pat on the head: fun (capped per hour so it cannot be farmed) and the "pet" quest. */
export function pat(save: Save, now: number): Result {
  return act(save, now, ({ s, p, ev }) => {
    if (!p) return
    const hour = Math.floor(now / HOUR)
    if (p.pets.hour !== hour) p.pets = { hour, n: 0 }
    if (p.pets.n < PETS_PER_HOUR) {
      p.pets.n++
      p.stats.fun = clamp(p.stats.fun + 2)
      addXp(s, p, 1, ev)
    }
    progress(s, p, 'pet', 1, ev, now)
  })
}

export type ShopId = ItemId | HatId | RoomId

export function priceOf(id: ShopId): number | undefined {
  if (id in FOODS) return FOODS[id as FoodId].price || undefined
  if (id in ITEMS) return ITEMS[id as 'medicine' | 'freeze'].price
  return COSMETICS[id]?.price || undefined
}

export function buy(save: Save, now: number, id: ShopId): Result {
  return act(save, now, ({ s, ev }) => {
    const price = priceOf(id)
    if (price === undefined) return
    if (s.kernels < price) return say(ev, 'Not enough kernels yet!')
    if (id === 'freeze') {
      if (s.streak.freezes >= MAX_FREEZES) return say(ev, `You can hold ${MAX_FREEZES} Streak Freezes.`)
      s.streak.freezes++
    } else if (id in HATS || id in ROOMS) {
      if (s.owned.includes(id)) return
      s.owned.push(id)
    } else s.items[id as ItemId] = (s.items[id as ItemId] ?? 0) + 1
    s.kernels -= price
  })
}

export function wearHat(save: Save, now: number, hat: HatId | null): Result {
  return act(save, now, ({ s, p }) => {
    if (p && (hat === null || s.owned.includes(hat))) p.hat = hat
  })
}

export function setRoom(save: Save, now: number, room: RoomId): Result {
  return act(save, now, ({ s, p }) => {
    if (p && s.owned.includes(room)) p.room = room
  })
}

export function claimGift(save: Save, now: number): Result {
  return act(save, now, ({ s, ev }) => {
    if (s.today.gift) return
    s.today.gift = true
    const g = giftFor(s.streak.count)
    s.kernels += g.kernels
    if (g.golden) s.items.golden = (s.items.golden ?? 0) + 1
    ev.push({ type: 'kernels', n: g.kernels })
  })
}
