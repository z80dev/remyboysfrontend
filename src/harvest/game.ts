/**
 * Remy's Harvest simulation: Remy walks the field path with a basket, the sky drops corn. No DOM, no drawing; the
 * frame loop reads the state and drains `events` for sound and effects.
 *
 * World units: the field is always FIELD_H tall; its width follows the view (main.ts, between MIN_W and FIELD_H).
 * Remy's feet stand on GROUND; the basket mouth sits RIM above them (hero drawn HERO_H tall, see art.ts).
 */

export const FIELD_H = 720
export const GROUND = 664
export const HERO_H = 220
/** Basket mouth: height above the feet, half-width of the catch window (the painted basket is ±32, plus slack). */
export const RIM = 106
export const BASKET_HALF = 44
export const MAX_LIVES = 5

export type Kind = 'corn' | 'golden' | 'gem' | 'squash' | 'beans' | 'rotten' | 'cabald'
export type Mood = 'idle' | 'dizzy' | 'cheer'

/** Points per kind before the combo multiplier and Golden Hour. Hazards score nothing. */
export const POINTS: Record<Kind, number> = { corn: 10, golden: 50, gem: 150, squash: 25, beans: 25, rotten: 0, cabald: 0 }
export const RADIUS: Record<Kind, number> = { corn: 26, golden: 28, gem: 28, squash: 30, beans: 24, rotten: 26, cabald: 34 }
const HAZARD: Record<Kind, boolean> = { corn: false, golden: false, gem: false, squash: false, beans: false, rotten: true, cabald: true }

export const LEVEL_NAMES = ['GOLDEN HOUR', 'HIGH HARVEST', 'SUNSET', 'DUSK', 'HARVEST MOON']
export const levelName = (level: number) => LEVEL_NAMES[level - 1] ?? `STARLIGHT ${level - 4}`
/** Good catches per level. */
export const PER_LEVEL = 25
const GOLDEN_TIME = 8
const KEY_SPEED = 720
const POINTER_SPEED = 1250

export interface Item {
  id: number
  kind: Kind
  x: number
  y: number
  vy: number
  /** Wind sway around the spawn column. */
  x0: number
  sway: number
  phase: number
  rot: number
  spin: number
  /** fall → caught (dropping into the basket) or ground (lying in the dirt, fading). */
  state: 'fall' | 'caught' | 'ground'
  t: number
}

export type GameEvent =
  | { type: 'catch'; kind: Kind; x: number; y: number; pts: number; mult: number; streak: number }
  | { type: 'sister'; kind: Kind; have: Sisters }
  | { type: 'sisters'; x: number; y: number; pts: number; healed: boolean }
  | { type: 'miss'; kind: Kind; x: number; lifeLost: boolean }
  | { type: 'bonk'; kind: Kind; x: number; y: number }
  | { type: 'golden' }
  | { type: 'level'; level: number }
  | { type: 'over' }

export interface Sisters {
  corn: boolean
  beans: boolean
  squash: boolean
}

export class Game {
  width: number
  x: number
  vx = 0
  /** Pointer target (world x) while a finger/mouse steers; null for keyboard. */
  target: number | null = null
  keyDir = 0
  mood: Mood = 'idle'
  moodT = 0
  /** Catch squash, 0..1, decays. */
  squash = 0
  /** Walk cycle phase. */
  step = 0

  items: Item[] = []
  events: GameEvent[] = []
  score = 0
  lives = MAX_LIVES
  caught = 0
  missed = 0
  streak = 0
  bestStreak = 0
  level = 1
  golden = 0
  sisters: Sisters = { corn: false, beans: false, squash: false }
  sistersDone = 0
  /** Corn in the basket (drawn as a pile; emptied on level-up). */
  pile = 0
  time = 0
  over = false
  overT = 0

  private nextId = 1
  private spawnT = 0.8
  private lastX: number
  private lastKind: Kind = 'corn'
  private rand: () => number

  constructor(width: number, rand: () => number = Math.random) {
    this.width = width
    this.x = width / 2
    this.lastX = width / 2
    this.rand = rand
  }

  get mult() {
    return Math.min(5, 1 + Math.floor(this.streak / 8))
  }

  /** Seconds between spawns, fall speed (units/s), hazard odds and wind sway (units) at the current level. */
  get pace() {
    const l = this.level - 1
    return {
      interval: Math.max(0.36, 0.95 - l * 0.085),
      speed: 235 + l * 30,
      hazard: Math.min(0.3, 0.07 + l * 0.04),
      wind: l < 2 ? 0 : Math.min(70, (l - 1) * 18),
    }
  }

  /** The field width changed (resize): keep everything at the same relative position. */
  resize(width: number) {
    if (width === this.width) return
    const k = width / this.width
    this.x *= k
    this.lastX *= k
    if (this.target !== null) this.target *= k
    for (const it of this.items) {
      it.x *= k
      it.x0 *= k
    }
    this.width = width
  }

  update(dt: number) {
    this.time += dt
    if (this.over) {
      this.overT += dt
      this.moveItems(dt * 0.35)
      return
    }
    this.movePlayer(dt)
    this.golden = Math.max(0, this.golden - dt)
    this.squash = Math.max(0, this.squash - dt * 4)
    if (this.moodT > 0) {
      this.moodT -= dt
      if (this.moodT <= 0) this.mood = 'idle'
    }
    this.spawnT -= dt
    if (this.spawnT <= 0) {
      this.spawn()
      this.spawnT += this.pace.interval * (0.75 + this.rand() * 0.5)
    }
    this.moveItems(dt)
  }

  private movePlayer(dt: number) {
    const stunned = this.mood === 'dizzy'
    const minX = BASKET_HALF * 0.6
    const maxX = this.width - BASKET_HALF * 0.6
    if (this.target !== null) {
      const want = stunned ? 0 : Math.max(-POINTER_SPEED, Math.min(POINTER_SPEED, (this.target - this.x) * 14))
      this.vx += (want - this.vx) * Math.min(1, dt * 22)
    } else {
      const want = stunned ? 0 : this.keyDir * KEY_SPEED
      this.vx += (want - this.vx) * Math.min(1, dt * (this.keyDir ? 14 : 18))
    }
    this.x += this.vx * dt
    if (this.x < minX || this.x > maxX) {
      this.x = Math.max(minX, Math.min(maxX, this.x))
      this.vx = 0
    }
    this.step += Math.abs(this.vx) * dt * 0.035
  }

  private spawn() {
    const l = this.level
    const p = this.pace
    let kind: Kind
    const r = this.rand()
    if (l > 1 && r < p.hazard) kind = this.rand() < 0.55 ? 'cabald' : 'rotten'
    else if (l === 1 && r < 0.05) kind = 'cabald'
    else {
      const g = this.rand()
      if (g < 0.035) kind = 'golden'
      else if (g < 0.05 && l >= 2) kind = 'gem'
      else if (g < 0.12) kind = this.sisters.beans ? 'squash' : 'beans'
      else if (g < 0.19) kind = this.sisters.squash ? 'beans' : 'squash'
      else kind = 'corn'
    }
    const margin = 40
    let x = margin + this.rand() * (this.width - margin * 2)
    if (!HAZARD[kind]) {
      // Fairness: the next catch is never further than Remy can run before it lands.
      const reach = KEY_SPEED * p.interval * 0.8 + BASKET_HALF
      x = Math.max(this.lastX - reach, Math.min(this.lastX + reach, x))
      this.lastX = x
    } else if (!HAZARD[this.lastKind] && Math.abs(x - this.lastX) < 70) {
      // Don't drop a hazard right on top of the catch the player is chasing.
      x = this.lastX + (x < this.lastX ? -1 : 1) * (90 + this.rand() * 80)
      x = Math.max(margin, Math.min(this.width - margin, x))
    }
    this.lastKind = kind
    const speed = p.speed * (kind === 'golden' || kind === 'gem' ? 1.15 : kind === 'cabald' ? 1.05 : 1) * (0.92 + this.rand() * 0.16)
    this.items.push({
      id: this.nextId++,
      kind,
      x,
      x0: x,
      y: -40,
      vy: speed,
      sway: p.wind * (0.4 + this.rand() * 0.6),
      phase: this.rand() * Math.PI * 2,
      rot: (this.rand() - 0.5) * 0.8,
      spin: (this.rand() - 0.5) * (kind === 'cabald' ? 2 : 3.4),
      state: 'fall',
      t: 0,
    })
  }

  private moveItems(dt: number) {
    const rimY = GROUND - RIM
    for (const it of this.items) {
      it.t += dt
      if (it.state === 'fall') {
        const prevY = it.y
        it.vy += 90 * dt
        it.y += it.vy * dt
        it.x = it.x0 + Math.sin(it.t * 1.6 + it.phase) * it.sway
        it.rot += it.spin * dt
        if (!this.over && prevY < rimY && it.y >= rimY - 4 && Math.abs(it.x - this.x) < BASKET_HALF + RADIUS[it.kind] * 0.35)
          this.catch(it)
        else if (it.y >= GROUND - RADIUS[it.kind] * 0.5) this.land(it)
      } else if (it.state === 'caught') {
        // Slide into the basket mouth with Remy.
        it.x += (this.x - it.x) * Math.min(1, dt * 18)
        it.y += 260 * dt
      }
    }
    this.items = this.items.filter((it) => (it.state === 'caught' ? it.t < 0.12 : it.state === 'ground' ? it.t < 1.6 : true))
  }

  private catch(it: Item) {
    it.state = 'caught'
    it.t = 0
    if (HAZARD[it.kind]) {
      this.streak = 0
      this.mood = 'dizzy'
      this.moodT = it.kind === 'cabald' ? 0.9 : 0.5
      this.events.push({ type: 'bonk', kind: it.kind, x: it.x, y: it.y })
      this.hurt()
      return
    }
    this.caught++
    this.streak++
    this.bestStreak = Math.max(this.bestStreak, this.streak)
    this.squash = 1
    const mult = this.mult * (this.golden > 0 ? 2 : 1)
    const pts = POINTS[it.kind] * mult
    this.score += pts
    if (it.kind !== 'squash' && it.kind !== 'beans') this.pile++
    this.events.push({ type: 'catch', kind: it.kind, x: it.x, y: it.y, pts, mult, streak: this.streak })
    if (it.kind === 'golden') {
      this.golden = GOLDEN_TIME
      this.events.push({ type: 'golden' })
    }
    const sister = it.kind === 'squash' ? 'squash' : it.kind === 'beans' ? 'beans' : 'corn'
    if (!this.sisters[sister]) {
      this.sisters[sister] = true
      this.events.push({ type: 'sister', kind: it.kind, have: { ...this.sisters } })
      if (this.sisters.corn && this.sisters.beans && this.sisters.squash) {
        this.sistersDone++
        const bonus = 300 * this.level
        this.score += bonus
        const healed = this.lives < MAX_LIVES
        if (healed) this.lives++
        this.sisters = { corn: false, beans: false, squash: false }
        this.events.push({ type: 'sisters', x: it.x, y: it.y, pts: bonus, healed })
      }
    }
    const level = 1 + Math.floor(this.caught / PER_LEVEL)
    if (level > this.level) {
      this.level = level
      this.pile = 0
      this.mood = 'cheer'
      this.moodT = 0.9
      this.events.push({ type: 'level', level })
    }
  }

  private land(it: Item) {
    it.state = 'ground'
    it.t = 0
    it.y = GROUND - RADIUS[it.kind] * 0.5
    if (HAZARD[it.kind]) return
    // Missing corn costs a life; the rest are just a lost chance.
    const lifeLost = it.kind === 'corn'
    if (lifeLost) {
      this.missed++
      this.streak = 0
      this.hurt()
    }
    this.events.push({ type: 'miss', kind: it.kind, x: it.x, lifeLost })
  }

  private hurt() {
    this.lives--
    if (this.lives <= 0 && !this.over) {
      this.lives = 0
      this.over = true
      this.mood = 'dizzy'
      this.moodT = 99
      this.events.push({ type: 'over' })
    }
  }
}
