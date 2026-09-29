/**
 * The battle field as a low-res canvas (1 canvas px = 1 logical px = 1rem): themed backdrop, terrain pads, Remy
 * sprites and every transient effect. It runs its own clock so hit-stop can freeze the action while the frame keeps
 * presenting, and exposes small promise-based primitives (`tween`, `fx`, `shake`, …) that the choreography in
 * fx.ts composes.
 */
import { SPRITE_FAR_FEET, SPRITE_FEET, art } from '../art'
import { canvas, ctx2d } from '../gfx/px'
import { type Backdrop, type BattleBg, makeBackdrop } from './backdrops'
import { shadow, silhouette } from './sprites'

export type Who = 'me' | 'foe'
export type Ease = (k: number) => number

export const ease = {
  linear: (k: number) => k,
  out: (k: number) => 1 - (1 - k) * (1 - k),
  in: (k: number) => k * k,
  inOut: (k: number) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2),
  back: (k: number) => 1 + 2.4 * (k - 1) ** 3 + 1.4 * (k - 1) ** 2,
  cubicOut: (k: number) => 1 - (1 - k) ** 3,
}

/** One transient effect; `z` < 0 draws behind the Remys, 0..1 in front, 2 above the flash (numbers, words). */
export interface Fx {
  z: number
  /** Advances by dt seconds; returns false once finished. */
  update(dt: number): boolean
  draw(ctx: CanvasRenderingContext2D): void
}

/** Frame-animated sprite particle with simple ballistics. Positions are the sprite centre. */
export class Particle implements Fx {
  z = 1
  x: number
  y: number
  vx = 0
  vy = 0
  ax = 0
  ay = 0
  drag = 0
  life = 1
  age = 0
  fps = 12
  loop = true
  /** Fade over the last quarter of life ('out'), or flicker ('blink'). */
  fade: 'none' | 'out' | 'blink' = 'out'
  delay = 0
  constructor(
    readonly frames: HTMLCanvasElement[],
    x: number,
    y: number,
    o: Partial<
      Pick<Particle, 'z' | 'vx' | 'vy' | 'ax' | 'ay' | 'drag' | 'life' | 'fps' | 'loop' | 'fade' | 'delay'>
    > = {},
  ) {
    this.x = x
    this.y = y
    Object.assign(this, o)
  }
  update(dt: number) {
    if (this.delay > 0) {
      this.delay -= dt
      return true
    }
    this.age += dt
    this.vx += this.ax * dt
    this.vy += this.ay * dt
    if (this.drag) {
      const k = Math.max(0, 1 - this.drag * dt)
      this.vx *= k
      this.vy *= k
    }
    this.x += this.vx * dt
    this.y += this.vy * dt
    return this.age < this.life
  }
  draw(ctx: CanvasRenderingContext2D) {
    if (this.delay > 0) return
    const n = this.frames.length
    const i = Math.floor(this.age * this.fps)
    const img = this.frames[this.loop ? i % n : Math.min(n - 1, i)]
    const k = this.age / this.life
    if (this.fade === 'blink' && k > 0.6 && Math.floor(this.age * 20) % 2) return
    ctx.globalAlpha = this.fade === 'out' && k > 0.75 ? Math.max(0, (1 - k) * 4) : 1
    ctx.drawImage(img, Math.round(this.x - img.width / 2), Math.round(this.y - img.height / 2))
    ctx.globalAlpha = 1
  }
}

/** A Remy (or trainer) on the field. Offsets/scales are animation state; `x`/`feet` come from the layout. */
export class Actor {
  x = 0
  feet = 0
  /** The distant foe on short screens uses the 2/3-size sprite re-reduced from the source art. */
  far = false
  dx = 0
  dy = 0
  sx = 1
  sy = 1
  visible = false
  alpha = 1
  /** White (or `flashCol`) silhouette overlay strength 0..1. */
  flash = 0
  flashCol = '#ffffff'
  /** Draw only a flat silhouette in this colour (intro shadow, catch beam). */
  sil: string | null = null
  /** 0..1: how far the sprite has sunk below its pad line (fainting). */
  sink = 0
  blinkUntil = 0
  glitchUntil = 0
  breathe = true
  /** Overlay painter clipped to the sprite (stat patterns); receives the sprite's box. */
  overlay: ((ctx: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, t: number) => void) | null =
    null
  idx = -1
  gold = false
  /** Opaque bounds of the current frame, in display px relative to the frame's top-left. */
  top = 0
  left = 0
  right = 0
  private img: HTMLCanvasElement | null = null
  private shine: HTMLCanvasElement[] = []
  private readonly phase = Math.random() * 2
  private token = 0

  constructor(readonly who: Who) {}

  get ready() {
    return !!this.img
  }
  /** Height of the drawn sprite from its top opaque row to the soles. */
  get h() {
    return this.feetRow - this.top
  }
  get w() {
    return this.right - this.left
  }
  get feetRow() {
    return this.far ? SPRITE_FAR_FEET : SPRITE_FEET
  }
  /** Current visual centre of the body (includes motion offsets). */
  center() {
    return {
      x: this.x + this.dx,
      y: this.feet + this.dy - this.h / 2,
      top: this.feet + this.dy - this.h,
      h: this.h,
      w: this.w,
    }
  }

  async setRemy(idx: number, gold = false) {
    const t = ++this.token
    const src = await art.sprite(idx, this.far)
    if (t !== this.token) return
    this.idx = idx
    this.gold = gold
    this.rebuild(src)
  }

  async setFar(far: boolean) {
    if (far === this.far) return
    this.far = far
    if (this.idx >= 0) {
      const t = ++this.token
      const src = await art.sprite(this.idx, far)
      if (t === this.token) this.rebuild(src)
    }
  }

  private rebuild(src: HTMLCanvasElement) {
    // Never mirrored (the foe included): shirt slogans and meme captions are art and must stay readable.
    const img = copy(src)
    const box = bounds(img)
    this.top = box.top
    this.left = box.left
    this.right = box.right
    this.img = img
    this.shine = this.gold ? goldFrames(img) : []
  }

  frame(t: number): HTMLCanvasElement | null {
    if (!this.img) return null
    if (!this.shine.length) return this.img
    // The shine sweeps every 2.2s; the rest of the cycle shows the static gold palette.
    const cyc = (t / 1000 + this.phase) % 2.2
    const f = Math.floor(cyc / 0.06) + 1
    return this.shine[f < this.shine.length ? f : 0]
  }

  draw(ctx: CanvasRenderingContext2D, t: number, ox: number) {
    if (!this.visible || !this.img || this.alpha <= 0) return
    if (t < this.blinkUntil && Math.floor(t / 70) % 2) return
    const base = this.frame(t) as HTMLCanvasElement
    const img = this.sil ? silhouette(base, this.sil) : base
    const w = Math.max(1, Math.round(img.width * this.sx))
    const h = Math.max(1, Math.round(img.height * this.sy))
    const cx = this.x + ox + this.dx
    const left = Math.round(cx - w / 2)
    let top = Math.round(this.feet + this.dy - this.feetRow * this.sy)
    const sinking = this.sink > 0
    if (sinking) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, ctx.canvas.width, Math.round(this.feet) + 1)
      ctx.clip()
      top += Math.round(this.sink * (this.feetRow + 2))
    }
    ctx.globalAlpha = this.alpha
    const glitch = t < this.glitchUntil
    const plain = w === img.width && h === img.height
    if (glitch && plain) {
      const seed = Math.floor(t / 50)
      for (let y = 0; y < h; y += 4) {
        const j = ((seed * 31 + y * 17) % 7) - 3
        ctx.drawImage(
          img,
          0,
          y,
          w,
          Math.min(4, h - y),
          left + (Math.abs(j) > 1 ? j * 2 : 0),
          top + y,
          w,
          Math.min(4, h - y),
        )
      }
    } else if (plain && this.breathe && !this.sil && !sinking) {
      // Idle breath: the upper body rises 1px every other beat while the legs stay planted (row duplication).
      const lift = Math.floor(t / 520 + this.phase) % 2
      const split = Math.round(this.feetRow - this.h * 0.32)
      ctx.drawImage(img, 0, 0, w, split, left, top - lift, w, split)
      ctx.drawImage(img, 0, split, w, h - split, left, top + split, w, h - split)
      if (lift) ctx.drawImage(img, 0, split - 1, w, 1, left, top + split - 1, w, 1)
    } else ctx.drawImage(img, left, top, w, h)
    if (this.flash > 0) {
      ctx.globalAlpha = this.alpha * Math.min(1, this.flash)
      ctx.drawImage(silhouette(base, this.flashCol), left, top, w, h)
    }
    ctx.globalAlpha = 1
    if (this.overlay && plain) this.overlay(ctx, base, left, top, t)
    if (sinking) ctx.restore()
  }
}

function copy(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = canvas(src.width, src.height)
  ctx2d(c).drawImage(src, 0, 0)
  return c
}

function bounds(img: HTMLCanvasElement) {
  const d = new Uint32Array(ctx2d(img).getImageData(0, 0, img.width, img.height).data.buffer)
  let top = img.height
  let left = img.width
  let right = 0
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++)
      if (d[y * img.width + x] >>> 24 > 127) {
        if (y < top) top = y
        if (x < left) left = x
        if (x + 1 > right) right = x + 1
      }
  return right === 0 ? { top: 0, left: 0, right: img.width } : { top, left, right }
}

const lum = (c: number) => (c & 255) * 0.3 + ((c >>> 8) & 255) * 0.59 + ((c >>> 16) & 255) * 0.11

const GOLD_RAMP = [0x3a2400, 0x7a4a00, 0xb8860b, 0xe0a100, 0xffd34d, 0xfff3b0].map((v) => [
  v >> 16,
  (v >> 8) & 255,
  v & 255,
])

/**
 * Golden Remys: the palette is pulled toward a 6-step gold ramp by luminance (identity survives at 45% original),
 * then a diagonal glint sweeps across in 14 frames. Frame 0 is the resting gold look.
 */
function goldFrames(img: HTMLCanvasElement): HTMLCanvasElement[] {
  const w = img.width
  const h = img.height
  const src = new Uint32Array(ctx2d(img).getImageData(0, 0, w, h).data.buffer)
  const gold = new Uint32Array(src.length)
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (c >>> 24 < 128) continue
    const l = lum(c) / 255
    const g = GOLD_RAMP[Math.min(5, Math.floor(l * 6))]
    const r = Math.round((c & 255) * 0.45 + g[0] * 0.55)
    const gg = Math.round(((c >>> 8) & 255) * 0.45 + g[1] * 0.55)
    const b = Math.round(((c >>> 16) & 255) * 0.45 + g[2] * 0.55)
    gold[i] = ((255 << 24) | (b << 16) | (gg << 8) | r) >>> 0
  }
  const n = 14
  const frames: HTMLCanvasElement[] = []
  for (let f = -1; f < n; f++) {
    const d = new Uint32Array(gold)
    if (f >= 0) {
      const pos = -h * 0.5 + ((w + h * 0.5 + 8) * f) / (n - 1)
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const i = y * w + x
          if (!d[i]) continue
          const u = x + y * 0.5 - pos
          if (u >= 0 && u < 5) d[i] = u < 2 ? 0xffe6ffff : 0xff8ef3ff
        }
    }
    const c = canvas(w, h)
    const x = ctx2d(c)
    const id = x.createImageData(w, h)
    new Uint32Array(id.data.buffer).set(d)
    x.putImageData(id, 0, 0)
    frames.push(c)
  }
  return frames
}

export interface Geo {
  W: number
  H: number
  /** Rows above the command/text panel. */
  field: number
  horizon: number
  foe: { x: number; feet: number; far: boolean; rx: number; ry: number }
  me: { x: number; feet: number; far: boolean; rx: number; ry: number }
}

/** Height reserved for the foe's info box at the top-left; the player's sprite never rises into it. */
const INFO_TOP = 40
/** The player's info box (plus its gap to the panel) sits above the panel on the right; the foe's pad stays above it. */
const ME_INFO = 56

export function layoutGeo(W: number, H: number, panel: number): Geo {
  const field = H - panel
  const roomy = field >= 200
  const far = !roomy
  const foeX = Math.round(W - Math.max(40, W * 0.24))
  const foeFeet = Math.round(roomy ? Math.max(field * 0.5, 126) : Math.min(field * 0.64, field - ME_INFO - 9))
  const meX = Math.round(Math.max(46, W * 0.22))
  // Short screens crop the player's legs behind the panel, like the GBA back sprites.
  const meFeet = Math.round(roomy ? field - 10 : Math.max(field - 6, INFO_TOP + SPRITE_FEET - 4))
  return {
    W,
    H,
    field,
    horizon: Math.round(foeFeet - (roomy ? 26 : 17)),
    foe: { x: foeX, feet: foeFeet, far, rx: roomy ? 46 : 34, ry: roomy ? 11 : 8 },
    me: { x: meX, feet: meFeet, far: false, rx: 52, ry: 13 },
  }
}

type Job = { t0: number; dur: number; fn: (k: number) => void; ease: Ease; done: () => void }

export class Stage {
  readonly el: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly bgc: HTMLCanvasElement
  private readonly bctx: CanvasRenderingContext2D
  geo: Geo = layoutGeo(240, 168, 46)
  backdrop: Backdrop | null = null
  readonly me = new Actor('me')
  readonly foe = new Actor('foe')
  readonly trainer = new Actor('foe')
  /** Horizontal offsets of each side (intro slide-in; pads and Remys move together). */
  slide = { me: 0, foe: 0 }
  pads = { me: false, foe: false }
  camX = 0
  /** Full-screen colour wash between the backdrop and the pads (move moods). */
  wash = { col: '#000000', a: 0 }
  /** Flash over everything but z≥2 effects. */
  flashFx = { col: '#ffffff', a: 0 }
  /** Horizontal-slice glitch of the backdrop (DEGEN). */
  glitchUntil = 0
  /** Stage clock in ms; stops during hit-stop. */
  now = 0
  private fxs: Fx[] = []
  private jobs: Job[] = []
  private shakeAmp = 0
  private shakeUntil = 0
  private freezeUntil = 0
  private raf = 0
  private last = 0
  private readonly bg: BattleBg
  private readonly opts: { cabald: boolean; boss: boolean }

  constructor(bg: BattleBg, opts: { cabald: boolean; boss: boolean }) {
    this.bg = bg
    this.opts = opts
    this.el = canvas(240, 168)
    this.el.className = 'bt-canvas'
    this.ctx = ctx2d(this.el)
    this.bgc = canvas(240, 168)
    this.bctx = ctx2d(this.bgc)
  }

  layout(W: number, H: number, panel: number) {
    const g = layoutGeo(W, H, panel)
    const same = this.backdrop && g.W === this.geo.W && g.H === this.geo.H && g.field === this.geo.field
    this.geo = g
    if (same) return
    for (const c of [this.el, this.bgc]) {
      c.width = W
      c.height = H
    }
    this.ctx.imageSmoothingEnabled = false
    this.bctx.imageSmoothingEnabled = false
    this.el.style.width = `${W}rem`
    this.el.style.height = `${H}rem`
    const broken = this.propagandaBroken
    this.backdrop = makeBackdrop(this.bg, { W, H, field: g.field, horizon: g.horizon, foe: g.foe, me: g.me }, this.opts)
    if (broken) this.backdrop.breakPropaganda()
    this.me.x = g.me.x
    this.me.feet = g.me.feet
    void this.me.setFar(g.me.far)
    for (const a of [this.foe, this.trainer]) {
      a.x = g.foe.x
      a.feet = g.foe.feet
      void a.setFar(g.foe.far)
    }
  }

  private propagandaBroken = false
  breakPropaganda() {
    this.propagandaBroken = true
    this.backdrop?.breakPropaganda()
  }

  start() {
    this.last = performance.now()
    const loop = (t: number) => {
      this.raf = requestAnimationFrame(loop)
      const dt = Math.min(50, t - this.last)
      this.last = t
      this.step(dt)
      this.render()
    }
    this.raf = requestAnimationFrame(loop)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    for (const j of this.jobs) j.done()
    this.jobs = []
    this.fxs = []
  }

  // ─── primitives ───

  /** Runs `fn(eased k)` every frame for `ms` of stage time; resolves after the final k = 1 call. */
  tween(ms: number, fn: (k: number) => void, e: Ease = ease.linear): Promise<void> {
    return new Promise((done) => {
      fn(e(0))
      this.jobs.push({ t0: this.now, dur: Math.max(1, ms), fn, ease: e, done })
    })
  }

  /** Waits `ms` of stage time (pauses during hit-stop, unlike ui.sleep). */
  wait(ms: number): Promise<void> {
    return this.tween(ms, () => {})
  }

  add(fx: Fx): Fx {
    this.fxs.push(fx)
    return fx
  }

  /** A one-off painter effect: `draw(ctx, k)` for `ms`, resolving when it ends. */
  paint(ms: number, z: number, draw: (ctx: CanvasRenderingContext2D, k: number, t: number) => void): Promise<void> {
    return new Promise((done) => {
      let age = 0
      this.add({
        z,
        update: (dt) => {
          age += dt * 1000
          if (age >= ms) done()
          return age < ms
        },
        draw: (ctx) => draw(ctx, Math.min(1, age / ms), this.now),
      })
    })
  }

  shake(power: number, ms = 320) {
    this.shakeAmp = Math.max(this.shakeAmp, power)
    this.shakeUntil = Math.max(this.shakeUntil, this.now + ms)
  }

  /** Hit-stop: freezes the stage clock (tweens, particles) for `ms` of real time. */
  freeze(ms: number) {
    this.freezeUntil = performance.now() + ms
  }

  flash(col: string, a: number, ms: number) {
    this.flashFx.col = col
    return this.tween(
      ms,
      (k) => {
        this.flashFx.a = a * (1 - k)
      },
      ease.out,
    )
  }

  /** Scene row → ground parallax factor, matching the backdrop's ground layers. */
  parallax(y: number) {
    const g = this.geo
    return 0.15 + (0.85 * (y - g.horizon)) / Math.max(1, g.me.feet - g.horizon)
  }

  // ─── frame ───

  private step(ms: number) {
    if (performance.now() < this.freezeUntil) return
    this.now += ms
    for (let i = 0; i < this.jobs.length; i++) {
      const j = this.jobs[i]
      const k = Math.min(1, (this.now - j.t0) / j.dur)
      j.fn(j.ease(k))
      if (k >= 1) {
        this.jobs.splice(i--, 1)
        j.done()
      }
    }
    const dt = ms / 1000
    this.fxs = this.fxs.filter((f) => f.update(dt))
  }

  private render() {
    const { ctx, geo } = this
    const t = this.now
    const bd = this.backdrop
    if (!bd) return
    let sx = 0
    let sy = 0
    if (t < this.shakeUntil) {
      const left = (this.shakeUntil - t) / 320
      const amp = Math.max(1, Math.round(this.shakeAmp * Math.min(1, left)))
      sx = Math.round((Math.random() * 2 - 1) * amp)
      sy = Math.round((Math.random() * 2 - 1) * amp * 0.6)
    } else this.shakeAmp = 0
    this.bctx.clearRect(0, 0, geo.W, geo.H)
    bd.draw(this.bctx, t / 1000, Math.round(this.camX))
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, geo.W, geo.H)
    if (t < this.glitchUntil) {
      const seed = Math.floor(t / 60)
      for (let y = 0; y < geo.H; y += 6) {
        const j = ((seed * 13 + y * 7) % 9) - 4
        ctx.drawImage(this.bgc, 0, y, geo.W, 6, sx + j * 3, sy + y, geo.W, 6)
      }
      ctx.globalCompositeOperation = 'difference'
      ctx.globalAlpha = 0.35
      ctx.drawImage(this.bgc, sx + 3, sy)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
    } else ctx.drawImage(this.bgc, sx, sy)
    if (this.wash.a > 0) {
      ctx.globalAlpha = this.wash.a
      ctx.fillStyle = this.wash.col
      ctx.fillRect(0, 0, geo.W, geo.H)
      ctx.globalAlpha = 1
    }
    ctx.save()
    ctx.translate(sx, sy)
    for (const who of ['foe', 'me'] as const) {
      if (!this.pads[who]) continue
      const g = geo[who]
      const ox = Math.round(this.slide[who] + this.camX * this.parallax(g.feet))
      const pad = bd.pad(g.rx, g.ry)
      ctx.drawImage(pad, Math.round(g.x - g.rx + ox), Math.round(g.feet - g.ry))
      const actors = who === 'me' ? [this.me] : [this.foe, this.trainer]
      for (const a of actors) {
        if (!a.visible || !a.ready || a.sink >= 1 || a.sil === '#ffffff') continue
        // The shadow shrinks as the Remy leaves the ground.
        const lift = Math.max(0, -a.dy)
        const k = Math.max(0.35, 1 - lift / 60) * Math.min(1, a.sx) * (1 - a.sink)
        const rx = Math.max(3, Math.round((a.w * 0.42 + 2) * k))
        const ry = Math.max(2, Math.round(g.ry * 0.55 * k))
        ctx.drawImage(shadow(rx, ry), Math.round(a.x + a.dx + ox - rx), Math.round(g.feet - ry + 1))
      }
    }
    this.drawFx(-1, 0)
    this.foe.draw(ctx, t, this.slide.foe + Math.round(this.camX * this.parallax(geo.foe.feet)))
    this.trainer.draw(ctx, t, this.slide.foe + Math.round(this.camX * this.parallax(geo.foe.feet)))
    this.me.draw(ctx, t, this.slide.me + Math.round(this.camX * this.parallax(geo.me.feet)))
    this.drawFx(0, 2)
    ctx.restore()
    bd.front?.(ctx, t / 1000, Math.round(this.camX))
    if (this.flashFx.a > 0) {
      ctx.globalAlpha = this.flashFx.a
      ctx.fillStyle = this.flashFx.col
      ctx.fillRect(0, 0, geo.W, geo.H)
      ctx.globalAlpha = 1
    }
    this.drawFx(2, 9)
  }

  private drawFx(lo: number, hi: number) {
    for (const f of this.fxs) if (f.z >= lo && f.z < hi) f.draw(this.ctx)
  }
}
