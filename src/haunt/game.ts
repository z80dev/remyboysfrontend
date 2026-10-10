/**
 * Night of the Cabald simulation: the player, four candy-themed weapons, five monster kinds (Cabald grunts, ghosts,
 * kamikaze jack-o'-lanterns, fireball admins, THE CABALD boss), endless waves, combo scoring, pickups, gore and light.
 */
import { audio } from './audio'
import type { Materials, PickupKind, Tex, ViewModel } from './gfx'
import { type DynLight, type Level, MH, MW, bakeLight, flowField, frameLight, sight } from './level'
import { type Renderer, pack } from './render'

export interface Sprites {
  grunt: Tex[]
  admin: Tex[]
  ghost: Tex[]
  boss: Tex
  jackFoe: Tex[]
  jackProp: Tex[]
  candle: Tex[]
  tomb: Tex[]
  bat: Tex[]
  fireball: Tex[]
  blast: Tex[]
  pickups: Record<PickupKind, Tex>
  vm: { idle: ViewModel[]; flash: Tex[] }
}

export interface Input {
  /** -1..1 */
  fwd: number
  strafe: number
  /** Turn rate -1..1 (keys / stick). */
  turn: number
  /** Absolute turn this frame in radians (mouse / touch drag). */
  look: number
  fire: boolean
  /** Requested weapon slot, consumed by the game. */
  slot: number | null
  cycle: boolean
}

type AmmoKind = 'corn' | 'shells' | 'pumpkins'
interface Weapon {
  name: string
  ammo: AmmoKind | null
  rate: number
  dmg: number
  pellets: number
  spread: number
  sfx: 'popper' | 'boom' | 'rush' | 'launch'
  kick: number
  light: [number, number, number]
}

export const WEAPONS: Weapon[] = [
  { name: 'CANDY POPPER', ammo: null, rate: 0.3, dmg: 15, pellets: 1, spread: 0.012, sfx: 'popper', kick: 7, light: [1.4, 0.5, 0.6] },
  { name: 'BOOMSTICK', ammo: 'shells', rate: 0.8, dmg: 11, pellets: 8, spread: 0.11, sfx: 'boom', kick: 14, light: [1.8, 1.3, 0.5] },
  { name: 'SUGAR RUSH', ammo: 'corn', rate: 0.075, dmg: 9, pellets: 1, spread: 0.035, sfx: 'rush', kick: 3, light: [1.5, 1.3, 0.6] },
  { name: 'JACK LAUNCHER', ammo: 'pumpkins', rate: 0.85, dmg: 120, pellets: 0, spread: 0, sfx: 'launch', kick: 12, light: [1.6, 0.8, 0.2] },
]
const AMMO_MAX: Record<AmmoKind, number> = { corn: 300, shells: 50, pumpkins: 20 }

type EnemyKind = 'grunt' | 'ghost' | 'jack' | 'admin' | 'boss'
interface Enemy {
  kind: EnemyKind
  tex: Tex[]
  x: number
  y: number
  z: number
  dx: number
  dy: number
  kx: number
  ky: number
  hp: number
  max: number
  speed: number
  r: number
  h: number
  dmg: number
  points: number
  hitT: number
  atkT: number
  fireT: number
  thinkT: number
  summonT: number
  /** Seconds spent pushing against geometry without moving; triggers a random sidestep. */
  stuckT: number
  rise: number
  dead: number
  phase: number
}

interface Shot {
  x: number
  y: number
  vx: number
  vy: number
  z: number
  foe: boolean
  life: number
}

interface Pickup {
  x: number
  y: number
  kind: PickupKind
  spot: number
  t: number
}

interface Particle {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  life: number
  color: number
  size: number
  glow: boolean
}

interface Blast {
  x: number
  y: number
  t: number
  big: number
}

export interface Popup {
  text: string
  t: number
  color: string
}

const STATS: Record<EnemyKind, { hp: number; speed: number; r: number; h: number; dmg: number; points: number }> = {
  grunt: { hp: 40, speed: 1.05, r: 0.28, h: 0.88, dmg: 8, points: 100 },
  ghost: { hp: 22, speed: 1.65, r: 0.26, h: 0.86, dmg: 7, points: 150 },
  jack: { hp: 12, speed: 2.7, r: 0.22, h: 0.46, dmg: 28, points: 120 },
  admin: { hp: 65, speed: 0.9, r: 0.28, h: 0.95, dmg: 12, points: 250 },
  boss: { hp: 1100, speed: 0.75, r: 0.5, h: 1.3, dmg: 25, points: 5000 },
}

const GORE: Record<EnemyKind, number[]> = {
  grunt: [pack(90, 160, 40), pack(60, 120, 30), pack(130, 20, 20)],
  ghost: [pack(170, 230, 255), pack(120, 200, 255)],
  jack: [pack(240, 120, 20), pack(255, 180, 40), pack(60, 100, 20)],
  admin: [pack(150, 60, 200), pack(110, 40, 160), pack(130, 20, 20)],
  boss: [pack(190, 60, 255), pack(255, 255, 255), pack(130, 20, 20)],
}

const COMBO_WORDS: [number, string][] = [
  [20, 'NO CABALD. ONLY ME.'],
  [15, 'CABALD CRUSHER!!!'],
  [10, 'SKELETAL!!'],
  [7, 'HAUNTED!'],
  [4, 'SPOOKY!'],
]

const PLAYER_R = 0.22
const RISE = 1.1

export class Game {
  x: number
  y: number
  a: number
  hp = 100
  weapon = 0
  owned = [true, false, false, false]
  ammo: Record<AmmoKind, number> = { corn: 0, shells: 0, pumpkins: 0 }
  fireT = 0
  flashT = 0
  kick = 0
  switchT = 0
  bob = 0
  hurtT = 0
  hurtFrom = 0
  grinT = 0
  pickupT = 0
  dead = 0
  score = 0
  kills = 0
  combo = 0
  comboT = 0
  bestCombo = 0
  wave = 0
  phase: 'break' | 'fight' = 'break'
  phaseT = 2.5
  /** Seconds since the current wave began. */
  fightT = 0
  queue: EnemyKind[] = []
  spawnT = 0
  time = 0
  shake = 0
  lightning = 0
  lightningT = 6
  thunderT = -1
  bossesBeaten = 0
  /** Title-screen camera: no weapon in view. */
  attract = false
  message = ''
  messageT = 0
  sub = ''
  popups: Popup[] = []
  enemies: Enemy[] = []
  shots: Shot[] = []
  pickups: Pickup[] = []
  particles: Particle[] = []
  blasts: Blast[] = []
  private flow = new Uint16Array(MW * MH)
  private flowTile = -1
  private lights: DynLight[] = []
  private groanT = 3

  constructor(
    readonly level: Level,
    readonly spr: Sprites,
    readonly mats: Materials,
  ) {
    this.x = level.start.x
    this.y = level.start.y
    this.a = level.start.a
    level.spots.forEach((s, i) => {
      if (s.kind === 'boomstick' || s.kind === 'rush') this.pickups.push({ x: s.x, y: s.y, kind: s.kind, spot: i, t: 0 })
    })
    this.restock()
    this.say('THE CABALD AWAKENS', 'SURVIVE THE NIGHT')
  }

  get alive() {
    return this.enemies.filter((e) => !e.dead).length + this.queue.length
  }

  private say(message: string, sub = '', t = 2.4) {
    this.message = message
    this.sub = sub
    this.messageT = t
  }

  private popup(text: string, color = '#ffd040') {
    this.popups.push({ text, t: 1.2, color })
    if (this.popups.length > 4) this.popups.shift()
  }

  /** Title-screen attract mode: weather, flicker and a slow look around, no monsters. */
  ambient(dt: number) {
    this.attract = true
    this.time += dt
    this.weather(dt)
    this.effects(dt)
    this.a += dt * 0.12
  }

  update(dt: number, input: Input) {
    this.time += dt
    this.messageT -= dt
    for (const p of this.popups) p.t -= dt
    this.popups = this.popups.filter((p) => p.t > 0)
    this.hurtT = Math.max(0, this.hurtT - dt)
    this.grinT = Math.max(0, this.grinT - dt)
    this.pickupT = Math.max(0, this.pickupT - dt)
    this.flashT = Math.max(0, this.flashT - dt)
    this.kick = Math.max(0, this.kick - dt * 60)
    this.switchT = Math.max(0, this.switchT - dt)
    this.shake = Math.max(0, this.shake - dt * 2.5)
    this.comboT -= dt
    if (this.comboT <= 0) this.combo = 0
    this.weather(dt)

    if (this.dead) {
      this.dead += dt
      this.a += dt * 0.3
    } else this.control(dt, input)

    this.waves(dt)
    this.monsters(dt)
    this.projectiles(dt)
    this.effects(dt)
    this.collect()
  }

  private weather(dt: number) {
    this.lightning = Math.max(0, this.lightning - dt * 1.8)
    this.lightningT -= dt
    if (this.lightningT <= 0) {
      this.lightning = 1
      this.lightningT = 7 + Math.random() * 10
      this.thunderT = 0.35 + Math.random() * 0.5
    }
    // A second, weaker flicker right after the strike.
    if (this.lightning > 0.55 && this.lightning < 0.6) this.lightning = 0.9
    if (this.thunderT > 0) {
      this.thunderT -= dt
      if (this.thunderT <= 0) audio.sfx('thunder')
    }
  }

  private control(dt: number, input: Input) {
    this.a += input.look + input.turn * 2.6 * dt
    const cos = Math.cos(this.a)
    const sin = Math.sin(this.a)
    let mx = cos * input.fwd - sin * input.strafe
    let my = sin * input.fwd + cos * input.strafe
    const len = Math.hypot(mx, my)
    if (len > 1) {
      mx /= len
      my /= len
    }
    const speed = 3.4
    this.slide(mx * speed * dt, my * speed * dt)
    this.bob += Math.min(1, len) * dt * 9

    if (input.slot !== null && input.slot !== this.weapon && this.owned[input.slot]) this.select(input.slot)
    if (input.cycle) {
      for (let k = 1; k <= 4; k++) {
        const w = (this.weapon + k) % 4
        if (this.owned[w] && this.hasAmmo(w)) {
          this.select(w)
          break
        }
      }
    }
    this.fireT -= dt
    if (input.fire && this.fireT <= 0 && this.switchT < 0.12) this.fire()
  }

  private select(w: number) {
    this.weapon = w
    this.switchT = 0.25
    this.fireT = Math.max(this.fireT, 0.2)
  }

  private hasAmmo(w: number) {
    const kind = WEAPONS[w].ammo
    return !kind || this.ammo[kind] > 0
  }

  private blocked(x: number, y: number, r: number) {
    const s = this.level.solid
    return (
      s[Math.floor(y - r) * MW + Math.floor(x - r)] ||
      s[Math.floor(y - r) * MW + Math.floor(x + r)] ||
      s[Math.floor(y + r) * MW + Math.floor(x - r)] ||
      s[Math.floor(y + r) * MW + Math.floor(x + r)]
    )
  }

  private slide(dx: number, dy: number) {
    if (!this.blocked(this.x + dx, this.y, PLAYER_R)) this.x += dx
    if (!this.blocked(this.x, this.y + dy, PLAYER_R)) this.y += dy
  }

  /** Distance from (x, y) along the unit direction to the first wall. */
  private wallDist(x: number, y: number, dx: number, dy: number) {
    let mx = Math.floor(x)
    let my = Math.floor(y)
    const ddx = Math.abs(1 / dx)
    const ddy = Math.abs(1 / dy)
    const sx = dx < 0 ? -1 : 1
    const sy = dy < 0 ? -1 : 1
    let sdx = dx < 0 ? (x - mx) * ddx : (mx + 1 - x) * ddx
    let sdy = dy < 0 ? (y - my) * ddy : (my + 1 - y) * ddy
    for (let i = 0; i < 64; i++) {
      if (sdx < sdy) {
        sdx += ddx
        mx += sx
        if (this.level.wall[my * MW + mx]) return sdx - ddx
      } else {
        sdy += ddy
        my += sy
        if (this.level.wall[my * MW + mx]) return sdy - ddy
      }
    }
    return 64
  }

  private fire() {
    const w = WEAPONS[this.weapon]
    if (!this.hasAmmo(this.weapon)) {
      audio.sfx('empty')
      this.fireT = 0.3
      // Fall back to the best weapon that still has ammo.
      for (let k = 3; k >= 0; k--)
        if (this.owned[k] && this.hasAmmo(k)) {
          this.select(k)
          break
        }
      return
    }
    if (w.ammo) this.ammo[w.ammo]--
    this.fireT = w.rate
    this.flashT = 0.07
    this.kick = w.kick
    this.shake = Math.max(this.shake, w.kick / 40)
    audio.sfx(w.sfx)
    if (!w.pellets) {
      const cos = Math.cos(this.a)
      const sin = Math.sin(this.a)
      this.shots.push({ x: this.x + cos * 0.3, y: this.y + sin * 0.3, vx: cos * 9, vy: sin * 9, z: 0.35, foe: false, life: 3 })
      return
    }
    let killsBefore = this.kills
    for (let p = 0; p < w.pellets; p++) this.hitscan(this.a + (Math.random() * 2 - 1) * w.spread, w.dmg * (0.8 + Math.random() * 0.4))
    killsBefore = this.kills - killsBefore
    if (killsBefore >= 3) this.popup('TRIPLE TROUBLE!', '#ff6a1a')
    else if (killsBefore === 2) this.popup('DOUBLE TROUBLE!', '#ff9a1a')
  }

  private hitscan(angle: number, dmg: number) {
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    let best = this.wallDist(this.x, this.y, dx, dy)
    let target: Enemy | null = null
    let prop = -1
    for (const e of this.enemies) {
      if (e.dead || e.rise > RISE * 0.5) continue
      const rx = e.x - this.x
      const ry = e.y - this.y
      const along = rx * dx + ry * dy
      // Point-blank foes (overlapping the player) still take the shot.
      if (along <= -e.r || along >= best) continue
      // A little aim assist with distance: there is no vertical aim and phones have thumbs.
      if (Math.abs(rx * dy - ry * dx) < e.r + 0.04 + along * 0.012) {
        best = along
        target = e
      }
    }
    this.level.props.forEach((p, i) => {
      if (p.kind !== 'jack' || p.hp <= 0) return
      const rx = p.x - this.x
      const ry = p.y - this.y
      const along = rx * dx + ry * dy
      if (along <= 0.05 || along >= best) return
      if (Math.abs(rx * dy - ry * dx) < 0.25) {
        best = along
        target = null
        prop = i
      }
    })
    const hx = this.x + dx * best
    const hy = this.y + dy * best
    if (target) {
      this.damage(target, dmg, dx * 0.6, dy * 0.6)
      this.spray(hx - dx * 0.1, hy - dy * 0.1, 0.45, GORE[target.kind], 4, 1.2)
      audio.sfx('hit')
    } else if (prop >= 0) {
      this.hitProp(prop, dmg)
    } else {
      this.spray(hx - dx * 0.05, hy - dy * 0.05, 0.5, [pack(200, 190, 160), pack(120, 110, 100)], 3, 0.8)
    }
  }

  private hitProp(i: number, dmg: number) {
    const p = this.level.props[i]
    p.hp -= dmg
    this.spray(p.x, p.y, 0.25, GORE.jack, 4, 1)
    if (p.hp <= 0) {
      p.hp = -1
      this.level.solid[Math.floor(p.y) * MW + Math.floor(p.x)] = 0
      bakeLight(this.level)
      this.explode(p.x, p.y, 2.2, 90, true)
    }
  }

  private damage(e: Enemy, dmg: number, kx: number, ky: number) {
    if (e.dead) return
    e.hp -= dmg
    e.hitT = 0.08
    const weight = e.kind === 'boss' ? 0.1 : 1
    e.kx += kx * weight
    e.ky += ky * weight
    if (e.hp <= 0) this.kill(e)
  }

  private kill(e: Enemy) {
    e.dead = 0.0001
    this.kills++
    this.combo = this.comboT > 0 ? this.combo + 1 : 1
    this.comboT = 2.5
    this.bestCombo = Math.max(this.bestCombo, this.combo)
    const mult = Math.min(this.combo, 10)
    this.score += e.points * mult
    this.popup(mult > 1 ? `+${e.points * mult} x${mult}` : `+${e.points}`)
    for (const [n, word] of COMBO_WORDS)
      if (this.combo === n) {
        this.say(word, `${n} KILL COMBO`, 1.6)
        this.grinT = 1.5
        break
      }
    this.spray(e.x, e.y, e.h * 0.6, GORE[e.kind], e.kind === 'boss' ? 80 : 18, e.kind === 'ghost' ? 0.8 : 2.2)
    audio.sfx(e.kind === 'boss' ? 'roar' : 'splat')
    if (e.kind === 'jack') this.explode(e.x, e.y, 1.9, 40, false)
    if (e.kind === 'boss') {
      this.bossesBeaten++
      this.shake = 1.5
      this.grinT = 3
      this.say('THE CABALD FALLS', 'THERE IS NO CABALD', 3)
      this.score += 2500
      for (let k = 0; k < 6; k++) this.drop(e.x + Math.cos(k) * 0.6, e.y + Math.sin(k) * 0.6, k % 2 ? 'candy' : this.ammoDrop())
    } else if (Math.random() < 0.16) this.drop(e.x, e.y, 'candy')
    else if (Math.random() < 0.26) this.drop(e.x, e.y, this.ammoDrop())
  }

  private ammoDrop(): PickupKind {
    const kinds: PickupKind[] = []
    if (this.owned[1]) kinds.push('shells')
    if (this.owned[2]) kinds.push('corn')
    if (this.owned[3]) kinds.push('pumpkins')
    return kinds.length ? kinds[Math.floor(Math.random() * kinds.length)] : 'candy'
  }

  private drop(x: number, y: number, kind: PickupKind) {
    if (this.level.solid[Math.floor(y) * MW + Math.floor(x)]) return
    this.pickups.push({ x, y, kind, spot: -1, t: 0 })
  }

  private explode(x: number, y: number, radius: number, dmg: number, hurtsPlayer: boolean) {
    this.blasts.push({ x, y, t: 0, big: radius / 2 })
    this.shake = Math.max(this.shake, 0.9)
    audio.sfx('explode')
    this.spray(x, y, 0.3, [pack(255, 200, 60), pack(255, 120, 20), pack(80, 60, 50)], 26, 3.5, true)
    for (const e of this.enemies) {
      if (e.dead) continue
      const d = Math.hypot(e.x - x, e.y - y)
      if (d < radius) this.damage(e, dmg * (1 - d / radius) + 8, ((e.x - x) / (d + 0.1)) * 1.5, ((e.y - y) / (d + 0.1)) * 1.5)
    }
    this.level.props.forEach((p, i) => {
      if (p.kind === 'jack' && p.hp > 0 && Math.hypot(p.x - x, p.y - y) < radius) {
        // Chain reactions, one frame later.
        p.hp = Math.min(p.hp, 0.5)
        setTimeout(() => p.hp > 0 && this.hitProp(i, 1), 120)
      }
    })
    const pd = Math.hypot(this.x - x, this.y - y)
    if (pd < radius && !this.dead) this.hurt(dmg * (1 - pd / radius) * (hurtsPlayer ? 0.45 : 1), x, y)
  }

  private hurt(dmg: number, fromX: number, fromY: number) {
    if (this.dead || dmg <= 0) return
    this.hp -= dmg
    this.hurtT = 0.4
    this.shake = Math.max(this.shake, 0.5)
    const rel = Math.atan2(fromY - this.y, fromX - this.x) - this.a
    this.hurtFrom = Math.sin(rel)
    audio.sfx('hurt')
    if (this.hp <= 0) {
      this.hp = 0
      this.dead = 0.0001
      audio.sfx('death')
      audio.music(false)
    }
  }

  private spray(x: number, y: number, z: number, colors: number[], n: number, force: number, glow = false) {
    for (let i = 0; i < n; i++) {
      if (this.particles.length > 600) this.particles.shift()
      const a = Math.random() * Math.PI * 2
      const s = Math.random() * force
      this.particles.push({
        x,
        y,
        z,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        vz: Math.random() * force * 1.4,
        life: 0.6 + Math.random() * 0.9,
        color: colors[i % colors.length],
        size: 0.025 + Math.random() * 0.04,
        glow,
      })
    }
  }

  // ---------------------------------------------------------------- waves

  private waves(dt: number) {
    if (this.dead) return
    this.phaseT -= dt
    if (this.phase === 'break') {
      if (this.phaseT <= 0) this.startWave()
      return
    }
    this.spawnT -= dt
    this.fightT += dt
    const cap = Math.min(18, 6 + this.wave)
    const live = this.enemies.filter((e) => !e.dead).length
    if (this.queue.length && live < cap && this.spawnT <= 0) {
      this.spawn(this.queue.shift() as EnemyKind)
      this.spawnT = Math.max(0.35, 1.4 - this.wave * 0.08)
    }
    if (!this.queue.length && !live) {
      const bonus = this.wave * 250
      this.score += bonus
      this.say(`WAVE ${this.wave} CLEARED`, `+${bonus} BONUS`)
      this.phase = 'break'
      this.phaseT = 4.5
      this.restock()
      if (this.wave === 3) {
        const i = this.level.spots.findIndex((s) => s.kind === 'launcher')
        const s = this.level.spots[i]
        if (!this.owned[3] && !this.pickups.some((p) => p.kind === 'launcher')) {
          this.pickups.push({ x: s.x, y: s.y, kind: 'launcher', spot: i, t: 0 })
          this.say('WAVE 3 CLEARED', 'A JACK LAUNCHER APPEARS IN THE GRAVEYARD', 3.5)
        }
      }
    }
  }

  private startWave() {
    this.wave++
    this.phase = 'fight'
    const n = this.wave
    const q: EnemyKind[] = []
    for (let i = 0; i < 3 + n * 2; i++) q.push('grunt')
    if (n >= 2) for (let i = 0; i < Math.floor(n * 0.8); i++) q.push('ghost')
    if (n >= 3) for (let i = 0; i < Math.floor(n * 0.6); i++) q.push('jack')
    if (n >= 4) for (let i = 0; i < Math.floor((n - 2) / 2); i++) q.push('admin')
    for (let i = q.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[q[i], q[j]] = [q[j], q[i]]
    }
    if (n % 5 === 0) {
      q.unshift('boss')
      this.say(`WAVE ${n}`, 'THE CABALD RISES', 3)
      audio.sfx('roar')
    } else this.say(`WAVE ${n}`, n === 1 ? 'THEY RISE FROM THE GRAVES' : `${q.length} OF THEM`)
    this.queue = q
    this.fightT = 0
    this.spawnT = 0.5
    audio.sfx('bell')
  }

  private restock() {
    this.level.spots.forEach((s, i) => {
      if (s.kind !== 'supply' || this.pickups.some((p) => p.spot === i)) return
      const r = Math.random()
      this.pickups.push({ x: s.x, y: s.y, kind: r < 0.4 ? 'candy' : this.ammoDrop(), spot: i, t: 0 })
    })
  }

  private spawn(kind: EnemyKind) {
    const far = this.level.spawns.filter((s) => Math.hypot(s.x - this.x, s.y - this.y) > 6)
    const hidden = far.filter((s) => !sight(this.level, s.x, s.y, this.x, this.y))
    const pool = kind === 'boss' ? far.filter((s) => this.level.outdoor[Math.floor(s.y) * MW + Math.floor(s.x)]) : hidden.length ? hidden : far
    const list = pool.length ? pool : this.level.spawns
    const s = list[Math.floor(Math.random() * list.length)]
    const st = STATS[kind]
    const scale = 1 + (this.wave - 1) * 0.09
    const pick = (texs: Tex[]) => [texs[Math.floor(Math.random() * texs.length)]]
    const tex =
      kind === 'grunt'
        ? pick(this.spr.grunt)
        : kind === 'ghost'
          ? pick(this.spr.ghost)
          : kind === 'admin'
            ? pick(this.spr.admin)
            : kind === 'boss'
              ? [this.spr.boss]
              : this.spr.jackFoe
    const hp = kind === 'boss' ? st.hp * (1 + this.bossesBeaten * 0.6) : st.hp * scale
    this.enemies.push({
      kind,
      tex,
      x: s.x + (Math.random() - 0.5) * 0.3,
      y: s.y + (Math.random() - 0.5) * 0.3,
      z: 0,
      dx: 0,
      dy: 0,
      kx: 0,
      ky: 0,
      hp,
      max: hp,
      speed: st.speed * Math.min(1.45, 1 + (this.wave - 1) * 0.035),
      r: st.r,
      h: st.h,
      dmg: st.dmg * Math.min(1.8, 1 + (this.wave - 1) * 0.06),
      points: st.points,
      hitT: 0,
      atkT: 1,
      fireT: 1.5 + Math.random() * 2,
      thinkT: 0,
      summonT: 6,
      stuckT: 0,
      rise: kind === 'ghost' ? 0 : RISE,
      dead: 0,
      phase: Math.random() * 10,
    })
    if (kind === 'boss') this.shake = 1.2
    if (kind !== 'ghost') {
      this.spray(s.x, s.y, 0.05, [pack(60, 45, 30), pack(40, 30, 20)], 12, 1.2)
      audio.sfx('rise')
    }
  }

  // ---------------------------------------------------------------- monsters

  private monsters(dt: number) {
    const tile = Math.floor(this.y) * MW + Math.floor(this.x)
    if (tile !== this.flowTile) {
      this.flowTile = tile
      flowField(this.level, this.x, this.y, this.flow)
    }
    this.groanT -= dt
    for (const e of this.enemies) {
      e.hitT = Math.max(0, e.hitT - dt)
      if (e.dead) {
        e.dead += dt
        continue
      }
      e.phase += dt
      if (e.rise > 0) {
        e.rise = Math.max(0, e.rise - dt)
        e.z = -(e.rise / RISE) * e.h
        continue
      }
      e.atkT -= dt
      e.fireT -= dt
      e.thinkT -= dt
      const tx = this.x - e.x
      const ty = this.y - e.y
      const dist = Math.hypot(tx, ty)
      if (e.thinkT <= 0) {
        e.thinkT = 0.15 + Math.random() * 0.15
        this.steer(e, tx, ty, dist)
      }
      if (this.dead) {
        e.dx *= 0.9
        e.dy *= 0.9
      }
      // Knockback decays; movement plus separation from the pack.
      let mx = e.dx * e.speed * dt + e.kx * dt * 6
      let my = e.dy * e.speed * dt + e.ky * dt * 6
      e.kx *= Math.max(0, 1 - dt * 8)
      e.ky *= Math.max(0, 1 - dt * 8)
      for (const o of this.enemies) {
        if (o === e || o.dead || o.rise) continue
        const ox = e.x - o.x
        const oy = e.y - o.y
        const d = Math.hypot(ox, oy)
        const min = e.r + o.r
        if (d > 0.001 && d < min) {
          mx += (ox / d) * (min - d) * 0.5
          my += (oy / d) * (min - d) * 0.5
        }
      }
      // Bodies don't overlap the player.
      const touch = e.r + PLAYER_R
      if (dist > 0.001 && dist < touch && e.kind !== 'ghost') {
        mx -= (tx / dist) * (touch - dist) * 0.5
        my -= (ty / dist) * (touch - dist) * 0.5
      }
      if (e.kind === 'ghost') {
        e.x = Math.min(MW - 1.2, Math.max(1.2, e.x + mx))
        e.y = Math.min(MH - 1.2, Math.max(1.2, e.y + my))
        e.z = 0.12 + Math.sin(e.phase * 2.2) * 0.08
      } else {
        const ox = e.x
        const oy = e.y
        // The boss is drawn huge but must still fit through one-tile doorways.
        const cr = Math.min(e.r * 0.8, 0.3)
        if (!this.blocked(e.x + mx, e.y, cr)) e.x += mx
        if (!this.blocked(e.x, e.y + my, cr)) e.y += my
        const pushing = dist > e.r + PLAYER_R + 0.3 && Math.hypot(e.x - ox, e.y - oy) < e.speed * dt * 0.25
        e.stuckT = pushing ? e.stuckT + dt : Math.max(0, e.stuckT - dt)
        if (e.stuckT > 0.8) {
          const a = Math.random() * Math.PI * 2
          e.dx = Math.cos(a)
          e.dy = Math.sin(a)
          e.thinkT = 0.6
          e.stuckT = 0
        }
        e.z = e.kind === 'jack' ? Math.abs(Math.sin(e.phase * 9)) * 0.14 : 0
      }
      if (this.dead) continue
      // Attacks.
      if (e.kind === 'jack') {
        if (dist < 0.75) {
          e.hp = 0
          this.kill(e)
        }
        continue
      }
      if (dist < e.r + PLAYER_R + 0.28 && e.atkT <= 0) {
        e.atkT = e.kind === 'boss' ? 1.4 : 1
        this.hurt(e.dmg, e.x, e.y)
        if (e.kind === 'grunt') audio.sfx('groan')
      }
      if ((e.kind === 'admin' || e.kind === 'boss') && e.fireT <= 0 && dist < 11 && sight(this.level, e.x, e.y, this.x, this.y)) {
        const base = Math.atan2(ty, tx)
        const fan = e.kind === 'boss' ? [-0.3, -0.15, 0, 0.15, 0.3] : [0]
        for (const off of fan)
          this.shots.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(base + off) * 5,
            vy: Math.sin(base + off) * 5,
            z: e.h * 0.5,
            foe: true,
            life: 4,
          })
        e.fireT = e.kind === 'boss' ? 2.2 : 2.2 + Math.random() * 1.5
        audio.sfx('fireball')
      }
      if (e.kind === 'boss') {
        e.summonT -= dt
        if (e.summonT <= 0) {
          e.summonT = 9
          this.queue.unshift('grunt', 'grunt')
          audio.sfx('roar')
        }
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead || e.dead < 0.7)
    if (this.groanT <= 0) {
      this.groanT = 2 + Math.random() * 4
      const near = this.enemies.find((e) => !e.dead && Math.hypot(e.x - this.x, e.y - this.y) < 7)
      if (near) audio.sfx(near.kind === 'ghost' ? 'ghost' : near.kind === 'jack' ? 'cackle' : 'groan')
    }
  }

  private steer(e: Enemy, tx: number, ty: number, dist: number) {
    const seen = dist < 1.2 || sight(this.level, e.x, e.y, this.x, this.y)
    // Admins hold a firing band and circle; once a wave drags on and only stragglers remain, they charge.
    const straggle = this.fightT > 40 && !this.queue.length && this.enemies.filter((o) => !o.dead).length <= 3
    if (e.kind === 'admin' && seen && !straggle && dist < 6) {
      const side = Math.sin(e.phase * 0.8) > 0 ? 1 : -1
      const back = dist < 2.8 ? -1 : dist > 4.5 ? 0.6 : 0
      e.dx = (tx * back - ty * side) / dist
      e.dy = (ty * back + tx * side) / dist
      const n = Math.hypot(e.dx, e.dy) || 1
      e.dx /= n
      e.dy /= n
      return
    }
    // Chase in a straight line only when the whole body fits along it; otherwise follow the flow field round corners.
    const px = (-ty / dist) * e.r
    const py = (tx / dist) * e.r
    const S = this.level.solid
    const open =
      dist < 1.2 ||
      (sight(this.level, e.x + px, e.y + py, this.x, this.y, S) && sight(this.level, e.x - px, e.y - py, this.x, this.y, S))
    if (e.kind === 'ghost' || open) {
      const wobble = e.kind === 'ghost' ? Math.sin(e.phase * 1.7) * 0.6 : 0
      const a = Math.atan2(ty, tx) + wobble
      e.dx = Math.cos(a)
      e.dy = Math.sin(a)
      return
    }
    const cx = Math.floor(e.x)
    const cy = Math.floor(e.y)
    let best = this.flow[cy * MW + cx]
    let bx = cx
    let by = cy
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx
        const ny = cy + dy
        if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue
        if (dx && dy && (this.level.solid[cy * MW + nx] || this.level.solid[ny * MW + cx])) continue
        const v = this.flow[ny * MW + nx]
        if (v < best) {
          best = v
          bx = nx
          by = ny
        }
      }
    const gx = bx + 0.5 - e.x
    const gy = by + 0.5 - e.y
    const d = Math.hypot(gx, gy) || 1
    e.dx = gx / d
    e.dy = gy / d
  }

  // ---------------------------------------------------------------- projectiles, effects, pickups

  private projectiles(dt: number) {
    for (const s of this.shots) {
      s.life -= dt
      s.x += s.vx * dt
      s.y += s.vy * dt
      if (!s.foe && Math.random() < 0.6) this.spray(s.x, s.y, s.z, [pack(255, 160, 40)], 1, 0.3, true)
      if (s.foe && Math.random() < 0.5) this.spray(s.x, s.y, s.z, [pack(90, 255, 110)], 1, 0.3, true)
      const ti = Math.floor(s.y) * MW + Math.floor(s.x)
      let hit = this.level.wall[ti] > 0 || s.life <= 0
      if (s.foe) {
        if (!this.dead && Math.hypot(s.x - this.x, s.y - this.y) < PLAYER_R + 0.15) {
          this.hurt(12, s.x, s.y)
          hit = true
        }
        if (hit) {
          s.life = 0
          this.spray(s.x, s.y, s.z, [pack(90, 255, 110), pack(200, 255, 200)], 10, 1.5, true)
        }
        continue
      }
      if (!hit) {
        hit = this.enemies.some((e) => !e.dead && !e.rise && Math.hypot(e.x - s.x, e.y - s.y) < e.r + 0.15)
        if (!hit && this.level.solid[ti]) hit = true
      }
      if (hit) {
        s.life = 0
        this.explode(s.x - s.vx * 0.02, s.y - s.vy * 0.02, 2.4, WEAPONS[3].dmg, true)
      }
    }
    this.shots = this.shots.filter((s) => s.life > 0)
  }

  private effects(dt: number) {
    for (const p of this.particles) {
      p.life -= dt
      p.vz -= 9 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.z += p.vz * dt
      if (p.z < 0) {
        p.z = 0
        p.vz = 0
        p.vx *= 0.5
        p.vy *= 0.5
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0)
    for (const b of this.blasts) b.t += dt
    this.blasts = this.blasts.filter((b) => b.t < 0.5)
    for (const p of this.pickups) p.t += dt
  }

  private collect() {
    if (this.dead) return
    this.pickups = this.pickups.filter((p) => {
      if (Math.hypot(p.x - this.x, p.y - this.y) > 0.55) return true
      switch (p.kind) {
        case 'candy':
          if (this.hp >= 100) return true
          this.hp = Math.min(100, this.hp + 20)
          this.popup('+20 CANDY', '#ff7ad8')
          break
        case 'corn':
        case 'shells':
        case 'pumpkins': {
          const add = { corn: 50, shells: 8, pumpkins: 3 }[p.kind]
          if (this.ammo[p.kind] >= AMMO_MAX[p.kind]) return true
          this.ammo[p.kind] = Math.min(AMMO_MAX[p.kind], this.ammo[p.kind] + add)
          this.popup(`+${add} ${p.kind.toUpperCase()}`, '#9affa0')
          break
        }
        default: {
          const slot = { boomstick: 1, rush: 2, launcher: 3 }[p.kind]
          const ammo = WEAPONS[slot].ammo as AmmoKind
          this.ammo[ammo] = Math.min(AMMO_MAX[ammo], this.ammo[ammo] + { boomstick: 16, rush: 120, launcher: 6 }[p.kind])
          this.owned[slot] = true
          this.select(slot)
          this.say(WEAPONS[slot].name, `PRESS ${slot + 1} OR TAP AMMO TO SWITCH`, 2)
          this.grinT = 1.5
          audio.sfx('weapon')
          this.pickupT = 0.3
          return false
        }
      }
      audio.sfx('pickup')
      this.pickupT = 0.25
      return false
    })
  }

  // ---------------------------------------------------------------- drawing

  private collectLights(): DynLight[] {
    const L = this.lights
    L.length = 0
    if (this.flashT > 0) {
      const [r, g, b] = WEAPONS[this.weapon].light
      L.push({ x: this.x + Math.cos(this.a) * 0.6, y: this.y + Math.sin(this.a) * 0.6, r, g, b, rad: 4.5 })
    }
    for (const s of this.shots)
      L.push(s.foe ? { x: s.x, y: s.y, r: 0.2, g: 1.2, b: 0.3, rad: 2.6 } : { x: s.x, y: s.y, r: 1.4, g: 0.7, b: 0.15, rad: 3 })
    for (const b of this.blasts) {
      const k = 1 - b.t / 0.5
      L.push({ x: b.x, y: b.y, r: 2.4 * k, g: 1.4 * k, b: 0.4 * k, rad: 4 + b.big * 2 })
    }
    for (const e of this.enemies) {
      if (e.dead) continue
      if (e.kind === 'ghost') L.push({ x: e.x, y: e.y, r: 0.25, g: 0.45, b: 0.7, rad: 2.2 })
      else if (e.kind === 'jack') L.push({ x: e.x, y: e.y, r: 1, g: 0.5, b: 0.1, rad: 2.6 })
      else if (e.kind === 'boss') L.push({ x: e.x, y: e.y, r: 0.9, g: 0.25, b: 1.3, rad: 4 })
    }
    return L
  }

  draw(r: Renderer, angleJitter: number) {
    const flicker = 0.94 + Math.sin(this.time * 13) * 0.03 + Math.sin(this.time * 7.3) * 0.03
    frameLight(this.level, r.light, flicker, this.lightning, this.collectLights())
    r.lantern = 0.75 + (this.flashT > 0 ? 0.6 : 0)
    r.lightning = this.lightning
    r.world(this.level, this.mats, this.x, this.y, this.a + angleJitter)

    type Item = { d: number; draw: () => void }
    const items: Item[] = []
    const cos = Math.cos(this.a)
    const sin = Math.sin(this.a)
    const add = (x: number, y: number, draw: () => void) => {
      const d = (x - this.x) * cos + (y - this.y) * sin
      if (d > 0.1) items.push({ d, draw })
    }
    const t = this.time
    const S = this.spr
    for (const p of this.level.props) {
      if (p.kind === 'tomb') add(p.x, p.y, () => r.sprite(S.tomb[p.variant % S.tomb.length], p.x, p.y, 0, 0.62))
      else if (p.kind === 'candle') add(p.x, p.y, () => r.sprite(S.candle[Math.floor(t * 6 + p.x) % 2], p.x, p.y, 0, 0.78))
      else if (p.hp > 0) add(p.x, p.y, () => r.sprite(S.jackProp[Math.floor(t * 5 + p.y) % 2], p.x, p.y, 0, 0.42, { feet: 31 }))
    }
    for (const p of this.pickups) {
      const tex = S.pickups[p.kind]
      const z = 0.06 + Math.abs(Math.sin(p.t * 3)) * 0.06
      add(p.x, p.y, () => r.sprite(tex, p.x, p.y, z, 0.24, { bright: 1.4 }))
    }
    for (const e of this.enemies) {
      const tex = e.kind === 'jack' ? e.tex[Math.floor(e.phase * 8) % 2] : e.tex[0]
      add(e.x, e.y, () => {
        if (e.dead) {
          // Die: sink and fade (ghosts rise and dissolve).
          const k = e.dead / 0.7
          if (e.kind === 'ghost') r.sprite(tex, e.x, e.y, e.z + k * 0.6, e.h, { alpha: 0.6 * (1 - k) })
          else r.sprite(tex, e.x, e.y, -k * e.h, e.h, { alpha: 1 - k * 0.5 })
          return
        }
        const sway = e.kind === 'grunt' || e.kind === 'admin' ? Math.sin(e.phase * 6) * 0.02 : 0
        r.sprite(tex, e.x + sway * -sin, e.y + sway * cos, e.z + Math.abs(Math.sin(e.phase * 6)) * 0.02, e.h, {
          flash: e.hitT > 0,
          alpha: e.kind === 'ghost' ? 0.55 + Math.sin(e.phase * 9) * 0.12 : 1,
          bright: e.kind === 'boss' ? 1.3 : 1,
        })
      })
    }
    for (const s of this.shots) {
      const tex = s.foe ? S.fireball[Math.floor(t * 12) % 2] : S.jackProp[0]
      add(s.x, s.y, () => r.sprite(tex, s.x, s.y, s.z - 0.12, s.foe ? 0.26 : 0.3, s.foe ? {} : { bright: 2 }))
    }
    for (const b of this.blasts)
      add(b.x, b.y, () => r.sprite(S.blast[Math.min(S.blast.length - 1, Math.floor((b.t / 0.5) * S.blast.length))], b.x, b.y, -0.1, 1.2 + b.big * 0.6))
    for (const p of this.particles) add(p.x, p.y, () => r.particle(p.x, p.y, p.z, p.size, p.color, p.glow))
    // Bats wheel over the graveyard.
    for (let i = 0; i < 7; i++) {
      const a = t * (0.5 + i * 0.07) + i * 1.9
      const bx = 15.5 + Math.cos(a) * (5 + i * 1.3)
      const by = 25 + Math.sin(a * 1.3) * (3 + (i % 3))
      add(bx, by, () => r.sprite(S.bat[Math.floor(t * 10 + i) % 2], bx, by, 0.8 + Math.sin(a * 3) * 0.12, 0.13))
    }
    items.sort((p, q) => q.d - p.d)
    for (const it of items) it.draw()
    this.drawWeapon(r)
  }

  private drawWeapon(r: Renderer) {
    if (this.dead || this.attract) return
    const vm = this.spr.vm.idle[this.weapon]
    const scale = r.VH / 175
    const w = vm.tex.w * scale
    const h = vm.tex.h * scale
    const moving = Math.sin(this.bob)
    const bx = moving * 5 * scale
    const by = Math.abs(Math.cos(this.bob)) * 4 * scale
    const drop = (this.switchT / 0.25) * h * 0.8
    const sx = r.W / 2 - w / 2 + bx
    const sy = r.VH - h + 8 * scale + by + this.kick * scale * 0.6 + drop
    const ix = Math.min(MW - 1, Math.max(0, Math.floor(this.x)))
    const iy = Math.min(MH - 1, Math.max(0, Math.floor(this.y)))
    const L = r.light
    const i = (iy * MW + ix) * 3
    const boost = this.flashT > 0 ? 1 : 0
    r.overlay(vm.tex, sx, sy, scale, L[i] + 0.55 + boost, L[i + 1] + 0.45 + boost * 0.8, L[i + 2] + 0.35 + boost * 0.5)
    if (this.flashT > 0) {
      const f = this.spr.vm.flash[this.weapon]
      r.overlay(f, sx + vm.mx * scale - (f.w * scale) / 2, sy + vm.my * scale - (f.h * scale) * 0.75, scale, 1, 1, 1)
    }
  }
}

