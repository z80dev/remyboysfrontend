/**
 * Remy's Harvest renderer: painted backgrounds that turn from golden hour to a harvest-moon night as the levels climb,
 * sun rays, drifting leaves, motes and fireflies, the falling harvest with glows, trails and ground shadows, Remy with
 * lean/bob/squash and a pile of corn in his basket, kernel bursts, popups and the HUD. Everything is drawn in field
 * units (FIELD_H tall) through one transform, so the 480×480 post embed and a full-screen phone look the same.
 */
import { type Art, HERO_BASKET_X, HERO_PX, HERO_RIM_Y, MOON, SUN } from './art'
import {
  BASKET_HALF,
  FIELD_H,
  GROUND,
  type Game,
  type GameEvent,
  HERO_H,
  type Item,
  type Kind,
  MAX_LIVES,
  PER_LEVEL,
  RADIUS,
  levelName,
} from './game'

const FONT = '"Lilita One", "Arial Black", sans-serif'
const INK = '#3b1c0c'
const HERO_K = HERO_H / HERO_PX
/** Drawn height of each kind's sprite. */
const ITEM_H: Record<Kind, number> = { corn: 66, golden: 70, gem: 70, squash: 62, beans: 60, rotten: 64, cabald: 74 }
const KERNEL: Record<Kind, string[]> = {
  corn: ['#ffd23f', '#ffc21a', '#ffe68a'],
  golden: ['#fff3a0', '#ffd23f', '#ffffff'],
  gem: ['#e2384d', '#3b6fe0', '#8a3bd1', '#f2a01c', '#1fb5a5'],
  squash: ['#f08a24', '#5f8f2a', '#ffb347'],
  beans: ['#6fbf3a', '#9ad35a', '#3f8a2a'],
  rotten: ['#3b3a2a', '#6b6a3a', '#8c8a5a'],
  cabald: ['#b6e35a', '#8fcf3a', '#e6ff9a'],
}
const LEAF = ['#e8792a', '#d4462a', '#f2b33d', '#b8541f', '#e09a2f']

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  color: string
  rot: number
  spin: number
  /** kernel: bouncing seed; spark: additive star; dust: soft puff; ring: shockwave. */
  type: 'kernel' | 'spark' | 'dust' | 'ring'
  bounced?: boolean
}

interface Popup {
  text: string
  x: number
  y: number
  life: number
  max: number
  size: number
  color: string
}

interface Leaf {
  x: number
  y: number
  vy: number
  phase: number
  spin: number
  size: number
  color: string
  front: boolean
}

interface Mote {
  x: number
  y: number
  phase: number
  speed: number
}

export class Renderer {
  /** Field width in units, and the transform from field units to canvas pixels. */
  fw = 720
  scale = 1
  ox = 0
  oy = 0
  private parts: Particle[] = []
  private pops: Popup[] = []
  private leaves: Leaf[] = []
  private motes: Mote[] = []
  private shake = 0
  private hurtFlash = 0
  private goldFlash = 0
  private night = 0
  private banner: { title: string; sub: string; t: number } | null = null
  private sistersFx = 0
  private livesFx: number[] = []
  private blur: HTMLCanvasElement | null = null
  private time = 0

  constructor(
    private ctx: CanvasRenderingContext2D,
    private art: Art,
  ) {
    for (let i = 0; i < 16; i++) this.leaves.push(this.leaf(Math.random() * FIELD_H, i % 4 === 0))
    for (let i = 0; i < 28; i++)
      this.motes.push({ x: Math.random(), y: 0.1 + Math.random() * 0.75, phase: Math.random() * 7, speed: 0.4 + Math.random() })
  }

  /** Canvas size in pixels; the field is FIELD_H tall and fw wide, centred. */
  layout(pw: number, ph: number, fw: number) {
    this.fw = fw
    this.scale = Math.min(pw / fw, ph / FIELD_H)
    this.ox = (pw - fw * this.scale) / 2
    this.oy = (ph - FIELD_H * this.scale) / 2
    // Letterbox bands: the background, tiny and smoothed back up, is a cheap blur.
    const b = document.createElement('canvas')
    b.width = 48
    b.height = 72
    b.getContext('2d')?.drawImage(this.art.bgDay, 0, 0, 48, 72)
    this.blur = b
  }

  /** Canvas px → field x. */
  toField(px: number) {
    return (px - this.ox) / this.scale
  }

  reset() {
    this.parts = []
    this.pops = []
    this.banner = null
    this.shake = this.hurtFlash = this.goldFlash = this.sistersFx = 0
    this.livesFx = []
  }

  // ------------------------------------------------------------------ events → effects

  fx(e: GameEvent, g: Game) {
    switch (e.type) {
      case 'catch': {
        const n = e.kind === 'gem' ? 26 : e.kind === 'golden' ? 22 : 12
        this.burst(g.x, GROUND - 112, e.kind, n, 1)
        this.parts.push(this.ring(g.x, GROUND - 106, e.kind === 'golden' || e.kind === 'gem' ? '#fff2a8' : '#fff'))
        const big = e.pts >= 100
        this.pop(`+${e.pts}`, g.x, GROUND - 150, big ? 40 : 30, e.kind === 'gem' ? '#c9f4ff' : e.kind === 'golden' ? '#ffe45c' : '#fff6d8')
        if (e.streak > 0 && e.streak % 8 === 0) this.pop(`COMBO ×${g.mult}!`, g.x, GROUND - 200, 30, '#ffb347')
        break
      }
      case 'sister':
        this.sistersFx = 0.5
        break
      case 'sisters':
        this.burst(g.x, GROUND - 120, 'gem', 40, 1.5)
        this.burst(g.x, GROUND - 120, 'corn', 20, 1.3)
        this.banner = { title: 'THREE SISTERS!', sub: e.healed ? `+${e.pts} · +1 CORN LIFE` : `+${e.pts}`, t: 0 }
        this.sistersFx = 1.2
        break
      case 'miss':
        this.dust(e.x, GROUND, 8)
        if (e.lifeLost) {
          this.livesFx.push(g.lives, 0)
          this.hurtFlash = 0.5
          this.shake = Math.max(this.shake, 0.18)
          this.pop('MISSED!', e.x, GROUND - 60, 24, '#ffb0a0')
        }
        break
      case 'bonk':
        this.shake = 0.45
        this.hurtFlash = 0.8
        this.livesFx.push(g.lives, 0)
        this.burst(e.x, e.y, e.kind, 16, 1.2)
        this.pop(e.kind === 'cabald' ? 'BONK!' : 'YUCK!', e.x, e.y - 40, 40, e.kind === 'cabald' ? '#c8ff6a' : '#d8d39a')
        break
      case 'golden':
        this.goldFlash = 1
        this.pop('GOLDEN HOUR · 2×', this.fw / 2, 250, 38, '#ffe45c')
        break
      case 'level':
        this.banner = { title: `LEVEL ${e.level}`, sub: levelName(e.level), t: 0 }
        for (let i = 0; i < 18; i++) this.leaves.push(this.leaf(-20 - Math.random() * 200, true))
        break
      case 'over':
        this.shake = 0.5
        break
    }
  }

  private burst(x: number, y: number, kind: Kind, n: number, power: number) {
    const colors = KERNEL[kind]
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4
      const s = (260 + Math.random() * 380) * power
      this.parts.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0,
        max: 0.9 + Math.random() * 0.6,
        size: 4 + Math.random() * 3.5,
        color: colors[i % colors.length],
        rot: Math.random() * 6,
        spin: (Math.random() - 0.5) * 20,
        type: i % 4 === 0 && kind !== 'rotten' ? 'spark' : 'kernel',
      })
    }
  }

  private ring(x: number, y: number, color: string): Particle {
    return { x, y, vx: 0, vy: 0, life: 0, max: 0.35, size: 20, color, rot: 0, spin: 0, type: 'ring' }
  }

  private dust(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++)
      this.parts.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y - 4,
        vx: (Math.random() - 0.5) * 140,
        vy: -30 - Math.random() * 60,
        life: 0,
        max: 0.6 + Math.random() * 0.4,
        size: 10 + Math.random() * 12,
        color: '#e8c79a',
        rot: 0,
        spin: 0,
        type: 'dust',
      })
  }

  private pop(text: string, x: number, y: number, size: number, color: string) {
    this.pops.push({ text, x: Math.max(80, Math.min(this.fw - 80, x)), y, life: 0, max: 1.1, size, color })
  }

  private leaf(y: number, front: boolean): Leaf {
    return {
      x: Math.random() * this.fw,
      y,
      vy: 30 + Math.random() * 40,
      phase: Math.random() * 7,
      spin: 1 + Math.random() * 2.5,
      size: (front ? 9 : 6) + Math.random() * 5,
      color: LEAF[Math.floor(Math.random() * LEAF.length)],
      front,
    }
  }

  // ------------------------------------------------------------------ frame

  update(dt: number, g: Game | null) {
    this.time += dt
    const targetNight = g ? Math.min(1, (g.level - 1) / 4) : 0
    this.night += (targetNight - this.night) * Math.min(1, dt * 0.6)
    this.shake = Math.max(0, this.shake - dt)
    this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.6)
    this.goldFlash = Math.max(0, this.goldFlash - dt * 1.4)
    this.sistersFx = Math.max(0, this.sistersFx - dt)
    if (this.banner) {
      this.banner.t += dt
      if (this.banner.t > 2.4) this.banner = null
    }
    for (let i = 0; i < this.livesFx.length; i += 2) this.livesFx[i + 1] += dt
    this.livesFx = this.livesFx.filter((_, i, a) => a[i - (i % 2) + 1] < 0.8)

    for (const p of this.parts) {
      p.life += dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.spin * dt
      if (p.type === 'kernel' || p.type === 'spark') {
        p.vy += 1100 * dt
        if (p.type === 'kernel' && p.y > GROUND + 6 && p.vy > 0) {
          p.y = GROUND + 6
          p.vy *= p.bounced ? -0.15 : -0.38
          p.vx *= 0.6
          p.bounced = true
        }
      } else if (p.type === 'dust') {
        p.vx *= 1 - dt * 3
        p.vy *= 1 - dt * 3
      }
    }
    this.parts = this.parts.filter((p) => p.life < p.max)
    for (const p of this.pops) {
      p.life += dt
      p.y -= 50 * dt
    }
    this.pops = this.pops.filter((p) => p.life < p.max)
    const wind = g ? g.pace.wind : 0
    for (const l of this.leaves) {
      l.y += l.vy * dt
      l.x += (Math.sin(this.time * 0.9 + l.phase) * 40 + 25 + wind * 0.8) * dt
      if (l.y > FIELD_H + 20 || l.x > this.fw + 30) Object.assign(l, this.leaf(-20 - Math.random() * 120, l.front))
    }
    if (this.leaves.length > 16) this.leaves = this.leaves.filter((l, i) => i < 16 || l.y < FIELD_H)
  }

  draw(g: Game | null, mode: 'title' | 'play' | 'over') {
    const c = this.ctx
    const cw = c.canvas.width
    const ch = c.canvas.height
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.globalCompositeOperation = 'source-over'
    c.globalAlpha = 1
    if (this.ox > 0.5 || this.oy > 0.5) {
      c.imageSmoothingEnabled = true
      if (this.blur) c.drawImage(this.blur, 0, 0, cw, ch)
      c.fillStyle = `rgba(20,10,30,${0.45 + this.night * 0.3})`
      c.fillRect(0, 0, cw, ch)
    }
    const sx = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 34 : 0
    const sy = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 34 : 0
    c.setTransform(this.scale, 0, 0, this.scale, this.ox + sx * this.scale, this.oy + sy * this.scale)
    c.save()
    c.beginPath()
    c.rect(0, 0, this.fw, FIELD_H)
    c.clip()

    if (mode === 'title') {
      this.drawTitle()
      c.restore()
      return
    }
    this.drawSky()
    this.drawMotes(false)
    for (const l of this.leaves) if (!l.front) this.drawLeaf(l)
    if (g) {
      for (const it of g.items) if (it.state === 'fall') this.drawShadow(it)
      this.drawHeroShadow(g)
      for (const it of g.items) if (it.state === 'ground') this.drawItem(it, g)
      this.drawHero(g)
      for (const it of g.items) if (it.state !== 'ground') this.drawItem(it, g)
    }
    this.drawParticles()
    for (const l of this.leaves) if (l.front) this.drawLeaf(l)
    this.drawMotes(true)
    this.drawOverlays(g)
    if (g) this.drawHud(g)
    this.drawPops()
    if (this.banner) this.drawBanner()
    c.restore()
  }

  // ------------------------------------------------------------------ scene

  /** Where the background painting goes: covers the field, bottom-anchored so the path stays under Remy. */
  private bgRect() {
    const img = this.art.bgDay
    const s = Math.max(this.fw / img.width, FIELD_H / img.height)
    const w = img.width * s
    const h = img.height * s
    return { x: (this.fw - w) / 2, y: FIELD_H - h, w, h }
  }

  private drawTitle() {
    const c = this.ctx
    const img = this.art.title
    // The square key art covers a square field; on a narrow one it fits the width (its painted title never crops)
    // over the field painting, which fills the rest.
    if (this.fw < FIELD_H) {
      const r = this.bgRect()
      c.drawImage(this.art.bgDay, r.x, r.y, r.w, r.h)
    }
    const s = this.fw / img.width
    const w = img.width * s
    const h = img.height * s
    // Slow Ken Burns drift, top-anchored.
    const z = 1.015 + Math.sin(this.time * 0.25) * 0.015
    c.drawImage(img, (this.fw - w * z) / 2, 0, w * z, h * z)
    if (this.fw < FIELD_H) {
      // Feather the key art's bottom edge into the field.
      const fade = c.createLinearGradient(0, h * z - 90, 0, h * z)
      fade.addColorStop(0, 'rgba(60,30,10,0)')
      fade.addColorStop(1, 'rgba(60,30,10,0.9)')
      c.fillStyle = fade
      c.fillRect(0, h * z - 90, this.fw, 90)
      c.fillStyle = 'rgba(60,30,10,0.35)'
      c.fillRect(0, h * z, this.fw, FIELD_H)
    }
    const grad = c.createLinearGradient(0, FIELD_H * 0.55, 0, FIELD_H)
    grad.addColorStop(0, 'rgba(30,12,4,0)')
    grad.addColorStop(1, 'rgba(30,12,4,0.85)')
    c.fillStyle = grad
    c.fillRect(0, 0, this.fw, FIELD_H)
    for (const l of this.leaves) if (l.front) this.drawLeaf(l)
  }

  private drawSky() {
    const c = this.ctx
    const r = this.bgRect()
    const n = this.night
    c.drawImage(this.art.bgDay, r.x, r.y, r.w, r.h)
    // Sunset grade between day and night, strongest mid-way.
    const dusk = Math.sin(Math.min(1, n * 1.6) * Math.PI) * 0.55
    if (dusk > 0.01) {
      c.globalCompositeOperation = 'multiply'
      const grad = c.createLinearGradient(0, 0, 0, FIELD_H)
      grad.addColorStop(0, `rgba(190,90,150,${dusk})`)
      grad.addColorStop(0.6, `rgba(255,140,70,${dusk})`)
      grad.addColorStop(1, `rgba(150,80,90,${dusk})`)
      c.fillStyle = grad
      c.fillRect(0, 0, this.fw, FIELD_H)
      c.globalCompositeOperation = 'source-over'
    }
    const nightA = Math.max(0, Math.min(1, (n - 0.45) / 0.45))
    if (nightA > 0) {
      c.globalAlpha = nightA
      c.drawImage(this.art.bgNight, r.x, r.y, r.w, r.h)
      c.globalAlpha = 1
    }
    c.globalCompositeOperation = 'lighter'
    if (nightA < 1) {
      // Sun rays.
      const sx = r.x + SUN.x * r.w
      const sy = r.y + SUN.y * r.h
      c.save()
      c.translate(sx, sy)
      c.rotate(this.time * 0.03)
      const a = (1 - nightA) * (0.07 + Math.sin(this.time * 0.7) * 0.015)
      for (let i = 0; i < 9; i++) {
        c.rotate((Math.PI * 2) / 9)
        const grad = c.createLinearGradient(0, 0, 900, 0)
        grad.addColorStop(0, `rgba(255,220,140,${a})`)
        grad.addColorStop(1, 'rgba(255,200,120,0)')
        c.fillStyle = grad
        c.beginPath()
        c.moveTo(0, 0)
        c.lineTo(900, -70)
        c.lineTo(900, 70)
        c.closePath()
        c.fill()
      }
      c.restore()
    }
    if (nightA > 0) {
      // The harvest moon breathes.
      const mx = r.x + MOON.x * r.w
      const my = r.y + MOON.y * r.h
      const rad = r.w * 0.16
      const grad = c.createRadialGradient(mx, my, rad * 0.3, mx, my, rad * 2.2)
      grad.addColorStop(0, `rgba(255,190,90,${nightA * (0.22 + Math.sin(this.time * 1.3) * 0.05)})`)
      grad.addColorStop(1, 'rgba(255,160,60,0)')
      c.fillStyle = grad
      c.fillRect(mx - rad * 2.2, my - rad * 2.2, rad * 4.4, rad * 4.4)
      // Twinkles.
      for (let i = 0; i < 24; i++) {
        const tx = r.x + ((i * 0.6180339 * r.w) % r.w)
        const ty = r.y + r.h * (0.05 + ((i * 0.3819 * 0.45) % 0.45))
        const tw = Math.max(0, Math.sin(this.time * (1.5 + (i % 5) * 0.4) + i))
        if (tw < 0.6) continue
        this.sparkle(tx, ty, 6 * tw, `rgba(255,250,220,${nightA * (tw - 0.6) * 2})`)
      }
    }
    c.globalCompositeOperation = 'source-over'
  }

  private drawMotes(front: boolean) {
    const c = this.ctx
    const n = this.night
    c.globalCompositeOperation = 'lighter'
    for (let i = front ? 0 : 1; i < this.motes.length; i += 2) {
      const m = this.motes[i]
      const x = ((m.x * this.fw + Math.sin(this.time * 0.3 * m.speed + m.phase) * 60 + this.time * 8 * m.speed) % (this.fw + 40)) - 20
      const y = m.y * FIELD_H + Math.sin(this.time * 0.5 * m.speed + m.phase * 2) * 30
      if (n > 0.5) {
        // Fireflies: blink low over the corn.
        const blink = Math.max(0, Math.sin(this.time * 2 * m.speed + m.phase * 3))
        const fy = FIELD_H * 0.55 + (y % (FIELD_H * 0.4))
        const grad = c.createRadialGradient(x, fy, 0, x, fy, 14)
        grad.addColorStop(0, `rgba(230,255,140,${(n - 0.5) * 2 * blink * 0.9})`)
        grad.addColorStop(1, 'rgba(200,255,100,0)')
        c.fillStyle = grad
        c.fillRect(x - 14, fy - 14, 28, 28)
      } else {
        c.fillStyle = `rgba(255,236,180,${(0.5 - n) * 0.7 * (0.5 + Math.sin(this.time * 2 + m.phase) * 0.5)})`
        c.beginPath()
        c.arc(x, y, 1.6 + m.speed, 0, Math.PI * 2)
        c.fill()
      }
    }
    c.globalCompositeOperation = 'source-over'
  }

  private drawLeaf(l: Leaf) {
    const c = this.ctx
    c.save()
    c.translate(l.x, l.y)
    c.rotate(Math.sin(this.time * l.spin + l.phase) * 1.2 + l.phase)
    c.scale(Math.cos(this.time * l.spin * 1.3 + l.phase), 1)
    c.fillStyle = l.color
    c.strokeStyle = 'rgba(70,30,10,0.6)'
    c.lineWidth = 1
    const s = l.size
    c.beginPath()
    c.moveTo(0, -s)
    c.quadraticCurveTo(s * 0.9, -s * 0.2, 0, s)
    c.quadraticCurveTo(-s * 0.9, -s * 0.2, 0, -s)
    c.fill()
    c.stroke()
    c.beginPath()
    c.moveTo(0, -s * 0.8)
    c.lineTo(0, s * 1.2)
    c.stroke()
    c.restore()
  }

  private drawShadow(it: Item) {
    const c = this.ctx
    const p = Math.max(0, Math.min(1, it.y / GROUND))
    const r = RADIUS[it.kind]
    c.fillStyle = `rgba(60,30,10,${0.08 + p * 0.22})`
    c.beginPath()
    c.ellipse(it.x, GROUND + 6, r * (0.5 + p * 0.6), r * (0.15 + p * 0.12), 0, 0, Math.PI * 2)
    c.fill()
  }

  private drawHeroShadow(g: Game) {
    const c = this.ctx
    c.fillStyle = 'rgba(60,30,10,0.32)'
    c.beginPath()
    c.ellipse(g.x - 6, GROUND + 4, 52, 11, 0, 0, Math.PI * 2)
    c.fill()
  }

  private drawHero(g: Game) {
    const c = this.ctx
    const img = this.art.hero[g.mood]
    const moving = Math.abs(g.vx) > 40
    const bob = moving && g.mood === 'idle' ? -Math.abs(Math.sin(g.step * Math.PI)) * 7 : 0
    const jump = g.mood === 'cheer' ? -Math.sin(Math.min(1, 1 - g.moodT / 0.9) * Math.PI) * 40 : 0
    const lean = g.mood === 'dizzy' ? Math.sin(g.time * 16) * 0.07 : (g.vx / 1250) * 0.22
    const sq = g.squash * g.squash
    c.save()
    c.translate(g.x, GROUND + bob + jump)
    c.rotate(lean)
    c.scale(1 + sq * 0.1, 1 - sq * 0.09)
    // Anchor: the basket centre over g.x (the cheer pose is centred on its sprite).
    const ax = g.mood === 'idle' ? HERO_BASKET_X : img.width / 2
    c.drawImage(img, -ax * HERO_K, -img.height * HERO_K, img.width * HERO_K, img.height * HERO_K)
    if (g.mood === 'idle' && g.pile > 0) this.drawPile(g)
    c.restore()
  }

  /** Corn heaped in the basket mouth, clipped at the front rim. */
  private drawPile(g: Game) {
    const c = this.ctx
    const rim = -(HERO_PX - HERO_RIM_Y) * HERO_K
    c.save()
    c.beginPath()
    c.rect(-BASKET_HALF + 8, rim - 60, BASKET_HALF * 2 - 16, 60 + 9)
    c.clip()
    const n = Math.min(g.pile, 10)
    const img = this.art.items.corn
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / 3)
      const col = (i % 3) - 1
      const h = 34
      const w = (img.width / img.height) * h
      c.save()
      c.translate(col * 15 + (row % 2) * 7, rim + 12 - row * 7)
      c.rotate(col * 0.5 + (row % 2 ? 0.25 : -0.2))
      c.drawImage(img, -w / 2, -h / 2, w, h)
      c.restore()
    }
    c.restore()
  }

  private drawItem(it: Item, g: Game) {
    const c = this.ctx
    const img = this.art.items[it.kind]
    const h = ITEM_H[it.kind]
    const w = (img.width / img.height) * h
    if (it.state === 'caught') {
      // Shrinks into the basket.
      const k = Math.max(0, 1 - it.t / 0.12)
      c.save()
      c.globalAlpha = k
      c.translate(it.x, it.y)
      c.rotate(it.rot)
      c.drawImage(img, (-w / 2) * k, (-h / 2) * k, w * k, h * k)
      c.restore()
      return
    }
    if (it.state === 'ground') {
      const fade = Math.min(1, Math.max(0, (1.6 - it.t) / 0.5))
      const bounce = Math.abs(Math.sin(it.t * 11)) * 14 * Math.exp(-it.t * 6)
      c.save()
      c.globalAlpha = fade
      c.translate(it.x, it.y - bounce)
      c.rotate(it.rot + (Math.PI / 2 - (it.rot % Math.PI)) * Math.min(1, it.t * 4))
      c.drawImage(img, -w / 2, -h / 2, w, h)
      c.restore()
      return
    }
    // Glows.
    if (it.kind === 'golden' || it.kind === 'gem' || it.kind === 'cabald') {
      const pulse = 0.75 + Math.sin(g.time * 8 + it.id) * 0.25
      const col =
        it.kind === 'golden'
          ? `rgba(255,214,80,${0.55 * pulse})`
          : it.kind === 'gem'
            ? `hsla(${(g.time * 240 + it.id * 40) % 360},100%,65%,${0.55 * pulse})`
            : `rgba(150,255,60,${0.35 * pulse})`
      c.globalCompositeOperation = 'lighter'
      const grad = c.createRadialGradient(it.x, it.y, 4, it.x, it.y, h * 0.95)
      grad.addColorStop(0, col)
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      c.fillStyle = grad
      c.fillRect(it.x - h, it.y - h, h * 2, h * 2)
      if (it.kind !== 'cabald' && Math.random() < 0.35)
        this.parts.push({
          x: it.x + (Math.random() - 0.5) * w,
          y: it.y + (Math.random() - 0.5) * h,
          vx: 0,
          vy: -60,
          life: 0,
          max: 0.5,
          size: 3 + Math.random() * 3,
          color: it.kind === 'golden' ? '#fff3a0' : `hsl(${Math.random() * 360},100%,75%)`,
          rot: 0,
          spin: 0,
          type: 'spark',
        })
      c.globalCompositeOperation = 'source-over'
    }
    // Motion trail.
    for (let k = 3; k >= 1; k--) {
      c.save()
      c.globalAlpha = 0.1 * (4 - k)
      c.translate(it.x, it.y - it.vy * 0.018 * k)
      c.rotate(it.rot - it.spin * 0.018 * k)
      c.drawImage(img, -w / 2, -h / 2, w, h)
      c.restore()
    }
    const wob = it.kind === 'cabald' ? 1 + Math.sin(g.time * 10 + it.id) * 0.05 : 1
    c.save()
    c.translate(it.x, it.y)
    c.rotate(it.rot)
    c.scale(wob, 2 - wob)
    c.drawImage(img, -w / 2, -h / 2, w, h)
    c.restore()
    if (it.kind === 'rotten') {
      // Flies.
      c.fillStyle = '#1b1b14'
      for (let f = 0; f < 3; f++) {
        const a = g.time * (6 + f) + f * 2.1 + it.id
        c.beginPath()
        c.arc(it.x + Math.cos(a) * 30, it.y + Math.sin(a * 1.3) * 26, 2.4, 0, Math.PI * 2)
        c.fill()
      }
    }
  }

  private sparkle(x: number, y: number, s: number, color: string) {
    const c = this.ctx
    c.fillStyle = color
    c.beginPath()
    c.moveTo(x, y - s)
    c.quadraticCurveTo(x, y, x + s, y)
    c.quadraticCurveTo(x, y, x, y + s)
    c.quadraticCurveTo(x, y, x - s, y)
    c.quadraticCurveTo(x, y, x, y - s)
    c.fill()
  }

  private drawParticles() {
    const c = this.ctx
    for (const p of this.parts) {
      const k = 1 - p.life / p.max
      if (p.type === 'ring') {
        c.strokeStyle = p.color
        c.globalAlpha = k * 0.8
        c.lineWidth = 5 * k
        c.beginPath()
        c.ellipse(p.x, p.y, p.size + (1 - k) * 70, (p.size + (1 - k) * 70) * 0.4, 0, 0, Math.PI * 2)
        c.stroke()
      } else if (p.type === 'dust') {
        c.globalAlpha = k * 0.5
        c.fillStyle = p.color
        c.beginPath()
        c.arc(p.x, p.y, p.size * (1.6 - k * 0.6), 0, Math.PI * 2)
        c.fill()
      } else if (p.type === 'spark') {
        c.globalCompositeOperation = 'lighter'
        c.globalAlpha = k
        this.sparkle(p.x, p.y, p.size * 1.6, p.color)
        c.globalCompositeOperation = 'source-over'
      } else {
        c.globalAlpha = Math.min(1, k * 2)
        c.save()
        c.translate(p.x, p.y)
        c.rotate(p.rot)
        c.fillStyle = p.color
        c.beginPath()
        c.ellipse(0, 0, p.size, p.size * 0.78, 0, 0, Math.PI * 2)
        c.fill()
        c.fillStyle = 'rgba(255,255,255,0.55)'
        c.beginPath()
        c.ellipse(-p.size * 0.3, -p.size * 0.25, p.size * 0.35, p.size * 0.22, 0, 0, Math.PI * 2)
        c.fill()
        c.restore()
      }
    }
    c.globalAlpha = 1
  }

  private drawOverlays(g: Game | null) {
    const c = this.ctx
    const cx = this.fw / 2
    const r = Math.hypot(cx, FIELD_H / 2)
    if (g && g.golden > 0) {
      const a = Math.min(1, g.golden) * (0.35 + Math.sin(this.time * 6) * 0.08)
      const grad = c.createRadialGradient(cx, FIELD_H / 2, r * 0.45, cx, FIELD_H / 2, r)
      grad.addColorStop(0, 'rgba(255,200,60,0)')
      grad.addColorStop(1, `rgba(255,190,40,${a})`)
      c.fillStyle = grad
      c.fillRect(0, 0, this.fw, FIELD_H)
    }
    if (this.goldFlash > 0) {
      c.globalCompositeOperation = 'lighter'
      c.fillStyle = `rgba(255,230,150,${this.goldFlash * 0.35})`
      c.fillRect(0, 0, this.fw, FIELD_H)
      c.globalCompositeOperation = 'source-over'
    }
    if (this.hurtFlash > 0) {
      const grad = c.createRadialGradient(cx, FIELD_H / 2, r * 0.35, cx, FIELD_H / 2, r)
      grad.addColorStop(0, 'rgba(200,30,20,0)')
      grad.addColorStop(1, `rgba(200,30,20,${this.hurtFlash * 0.55})`)
      c.fillStyle = grad
      c.fillRect(0, 0, this.fw, FIELD_H)
    }
    if (g?.over) {
      c.fillStyle = `rgba(25,10,30,${Math.min(0.55, g.overT * 0.5)})`
      c.fillRect(0, 0, this.fw, FIELD_H)
    }
  }

  // ------------------------------------------------------------------ HUD

  text(s: string, x: number, y: number, size: number, fill: string, align: CanvasTextAlign = 'left') {
    const c = this.ctx
    c.font = `${size}px ${FONT}`
    c.textAlign = align
    c.textBaseline = 'middle'
    c.lineJoin = 'round'
    c.strokeStyle = INK
    c.lineWidth = size * 0.22
    c.strokeText(s, x, y)
    c.fillStyle = fill
    c.fillText(s, x, y)
  }

  private drawHud(g: Game) {
    const c = this.ctx
    const pad = 18
    this.text(g.score.toLocaleString('en-US'), pad, 36, 42, '#fff4d6')
    // Lives: corn ears.
    const corn = this.art.items.corn
    for (let i = 0; i < MAX_LIVES; i++) {
      const lost = i >= g.lives
      const fx = this.livesFx.findIndex((v, k) => k % 2 === 0 && v === i)
      const t = fx >= 0 ? this.livesFx[fx + 1] : 1
      const h = 30
      const w = (corn.width / corn.height) * h
      c.save()
      c.translate(pad + 12 + i * 26, 80)
      c.rotate(0.25)
      if (lost && t < 0.8) {
        c.globalAlpha = 1 - t / 0.8
        c.translate(0, t * 40)
        c.rotate(t * 3)
        c.scale(1 + t, 1 + t)
      } else if (lost) c.globalAlpha = 0.22
      c.drawImage(corn, -w / 2, -h / 2, w, h)
      c.restore()
    }
    // Combo meter.
    if (g.streak >= 3) {
      const m = g.mult
      this.text(`×${m}`, pad, 116, 26, m >= 5 ? '#ffd23f' : '#ffe9b0')
      c.fillStyle = 'rgba(40,20,10,0.55)'
      c.fillRect(pad + 40, 110, 84, 10)
      c.fillStyle = '#ffc21a'
      c.fillRect(pad + 40, 110, m >= 5 ? 84 : ((g.streak % 8) / 8) * 84, 10)
    }
    // Three Sisters.
    const slots: [Kind, boolean][] = [
      ['corn', g.sisters.corn],
      ['beans', g.sisters.beans],
      ['squash', g.sisters.squash],
    ]
    const pulse = this.sistersFx > 0 ? 1 + Math.sin(this.sistersFx * 20) * 0.08 : 1
    slots.forEach(([kind, have], i) => {
      const x = this.fw - pad - 22 - (2 - i) * 50
      const y = 40
      c.fillStyle = have ? 'rgba(255,230,160,0.9)' : 'rgba(40,20,10,0.45)'
      c.strokeStyle = have ? '#fff' : 'rgba(255,240,210,0.55)'
      c.lineWidth = 3
      c.beginPath()
      c.arc(x, y, 21 * pulse, 0, Math.PI * 2)
      c.fill()
      c.stroke()
      const img = this.art.items[kind]
      const h = 34
      const w = (img.width / img.height) * h
      c.globalAlpha = have ? 1 : 0.35
      c.drawImage(img, x - w / 2, y - h / 2, w, h)
      c.globalAlpha = 1
    })
    this.text('THREE SISTERS', this.fw - pad - 72, 76, 14, '#fff0cc', 'center')
    // Level progress.
    const prog = (g.caught % PER_LEVEL) / PER_LEVEL
    c.fillStyle = 'rgba(40,20,10,0.45)'
    c.fillRect(this.fw - pad - 122, 90, 100, 7)
    c.fillStyle = '#9fe06a'
    c.fillRect(this.fw - pad - 122, 90, 100 * prog, 7)
    this.text(`LV ${g.level}`, this.fw - pad, 94, 16, '#e8ffd0', 'right')
    // Golden Hour timer.
    if (g.golden > 0) {
      const w = 180
      c.fillStyle = 'rgba(60,30,0,0.5)'
      c.fillRect(this.fw / 2 - w / 2, 140, w, 10)
      c.fillStyle = '#ffd23f'
      c.fillRect(this.fw / 2 - w / 2, 140, (w * g.golden) / 8, 10)
      this.text('GOLDEN HOUR 2×', this.fw / 2, 124, 22, '#ffe45c', 'center')
    }
  }

  private drawPops() {
    for (const p of this.pops) {
      const k = p.life / p.max
      const s = k < 0.15 ? 0.6 + (k / 0.15) * 0.55 : k < 0.3 ? 1.15 - ((k - 0.15) / 0.15) * 0.15 : 1
      this.ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1
      this.text(p.text, p.x, p.y, p.size * s, p.color, 'center')
    }
    this.ctx.globalAlpha = 1
  }

  private drawBanner() {
    if (!this.banner) return
    const c = this.ctx
    const t = this.banner.t
    const inK = Math.min(1, t / 0.35)
    const outK = t > 2 ? (t - 2) / 0.4 : 0
    const ease = 1 - (1 - inK) ** 3
    const y = FIELD_H * 0.36
    const x = this.fw / 2 + (1 - ease) * -this.fw + outK * this.fw
    c.save()
    c.globalAlpha = 1 - outK
    c.fillStyle = 'rgba(60,25,8,0.72)'
    c.beginPath()
    c.moveTo(x - 260, y - 52)
    c.lineTo(x + 260, y - 52)
    c.lineTo(x + 230, y + 50)
    c.lineTo(x - 230, y + 50)
    c.closePath()
    c.fill()
    c.strokeStyle = '#f2b33d'
    c.lineWidth = 3
    c.stroke()
    this.text(this.banner.title, x, y - 14, 48, '#ffe7a0', 'center')
    this.text(this.banner.sub, x, y + 28, 24, '#fff6e4', 'center')
    c.restore()
  }
}
