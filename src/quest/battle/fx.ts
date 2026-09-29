/**
 * Battle choreography on the pixel stage: intros, send-outs, faints, catching and every move's effect. Each function
 * resolves at the beat battle.ts waits for (usually the moment of impact); trailing particles finish on their own.
 */
import type { Move, MoveId, RType } from '../data'
import { type Col, canvas, css, ctx2d, hex } from '../gfx/px'
import {
  BLUE,
  GOLD,
  GREEN,
  PURPLE,
  RED,
  arrow,
  beam,
  bubble,
  candle,
  chevron,
  cloud,
  coin,
  drop,
  gem,
  impact,
  moon,
  orb,
  paper,
  plus,
  ring,
  rocket,
  rotated,
  rug,
  silhouette,
  star,
  twinkle,
  wallet,
  wave,
  word,
} from './sprites'
import { type Actor, Particle, type Stage, ease } from './stage'

const rand = Math.random
const TYPE_RAMP: Record<RType, Col[]> = { BULL: GREEN, BEAR: RED, WHALE: BLUE, DEGEN: PURPLE, MEME: GOLD }
const WHITE_SIL = '#ffffff'
type Id = MoveId | 'panic'

/** Lighter/darker screen wash that fades in, holds and fades out; resolves when gone. */
function wash(st: Stage, col: string, a: number, ms: number) {
  st.wash.col = col
  return st.tween(ms, (k) => {
    st.wash.a = a * (k < 0.25 ? k / 0.25 : k > 0.7 ? (1 - k) / 0.3 : 1)
  })
}

function puff(st: Stage, x: number, y: number, n: number, col = '#e8e0d0') {
  const frames = [dot(3, col), dot(2, col), dot(1, col)]
  for (let i = 0; i < n; i++)
    st.add(
      new Particle(frames, x + (rand() - 0.5) * 16, y - rand() * 3, {
        vx: (rand() - 0.5) * 40,
        vy: -8 - rand() * 18,
        drag: 3,
        life: 0.45 + rand() * 0.2,
        fps: 6,
        loop: false,
        fade: 'none',
      }),
    )
}

const dots = new Map<string, HTMLCanvasElement>()
/** Solid square `s` px (confetti, dust, debris). */
function dot(s: number, col: string): HTMLCanvasElement {
  const key = `${s}${col}`
  let c = dots.get(key)
  if (!c) {
    c = canvas(s, s)
    const x = ctx2d(c)
    x.fillStyle = col
    x.fillRect(0, 0, s, s)
    dots.set(key, c)
  }
  return c
}

function sparkles(st: Stage, x: number, y: number, n: number, spread: number, col?: Col, z = 1) {
  const f = twinkle(col)
  const frames = [f[0], f[1], f[2], f[3], f[2], f[1], f[0]]
  for (let i = 0; i < n; i++)
    st.add(
      new Particle(frames, x + (rand() - 0.5) * spread, y + (rand() - 0.5) * spread * 0.8, {
        z,
        life: 0.5,
        fps: 14,
        loop: false,
        fade: 'none',
        delay: rand() * 0.25,
        vy: -6,
      }),
    )
}

/** Impact star + shockwave ring at (x, y) in the move type's colours. */
export function burst(st: Stage, x: number, y: number, type: RType, big = false) {
  const r = TYPE_RAMP[type]
  st.add(new Particle(impact(big ? 18 : 12, r[2]), x, y, { life: 0.24, fps: 12.5, loop: false, fade: 'none', z: 1.5 }))
  const rings = [6, 10, 14, 18, 22, 26].map((n) => ring(big ? n + 4 : n, r[3]))
  st.add(new Particle(rings, x, y, { life: 0.3, fps: 20, loop: false, fade: 'none', z: 1.4 }))
}

// ─── motion ───

/** Attack lunge toward the other side (me: up-right, foe: down-left). */
export function lunge(st: Stage, a: Actor, k = 1) {
  const d = a.who === 'me' ? 1 : -1
  return st.tween(360, (t) => {
    const s = t < 0.3 ? -0.25 * (t / 0.3) : t < 0.55 ? -0.25 + 1.25 * ((t - 0.3) / 0.25) : 1 - (t - 0.55) / 0.45
    a.dx = Math.round(16 * k * d * s)
    a.dy = Math.round(-6 * k * d * s)
  })
}

export function hop(st: Stage, a: Actor) {
  return st.tween(420, (t) => {
    a.dy = -Math.round(t < 0.5 ? Math.sin(t * 2 * Math.PI) * 8 : Math.abs(Math.sin((t - 0.5) * 2 * Math.PI)) * 3)
    a.sy = t < 0.08 || (t > 0.46 && t < 0.54) ? 0.92 : 1
    a.sx = a.sy === 1 ? 1 : 1.06
  })
}

export async function dodge(st: Stage, a: Actor) {
  const d = a.who === 'me' ? -1 : 1
  a.alpha = 0.6
  await st.tween(400, (t) => {
    a.dx = Math.round(d * 14 * (t < 0.3 ? t / 0.3 : t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4))
  })
  a.alpha = 1
  const c = a.center()
  st.add(new Particle([word('MISS', hex('#ffffff'))], c.x, c.top - 4, { vy: -18, life: 0.7, z: 2 }))
}

/** Hit reaction: white flash blinks, knock-back jitter, impact star, floating damage number. */
export function hit(st: Stage, a: Actor, type: RType, eff: number, crit: boolean, dealt: number) {
  const c = a.center()
  const d = a.who === 'me' ? -1 : 1
  if (crit) st.freeze(90)
  a.blinkUntil = st.now + 420
  a.flashCol = '#ffffff'
  void st.tween(160, (k) => {
    a.flash = 1 - k
  })
  void st.tween(360, (k) => {
    a.dx = Math.round(d * 4 * Math.sin(k * Math.PI * 4) * (1 - k))
  })
  burst(st, c.x + (rand() - 0.5) * 8, c.y + (rand() - 0.5) * 8, type, crit || eff > 1)
  if (crit || eff > 1) {
    st.shake(crit && eff > 1 ? 5 : 3, 380)
    void st.flash('#ffffff', crit ? 0.7 : 0.45, 200)
  } else st.shake(1, 180)
  const col = crit ? hex('#ffd34d') : eff > 1 ? hex('#ff9a3a') : eff < 1 ? hex('#b8c0d8') : hex('#ffffff')
  const num = new Particle([word(`-${dealt}`, col, 2)], c.x + d * 6, c.top + 6, {
    vy: -48,
    ay: 90,
    life: 0.9,
    z: 2,
    fade: 'out',
  })
  st.add(num)
  if (crit)
    st.add(
      new Particle([word('CRIT!', hex('#ffd34d'))], c.x - d * 8, c.top - 6, {
        vy: -20,
        life: 0.9,
        z: 2,
        fade: 'blink',
      }),
    )
}

/** Recoil / weak self-hit: just the blink. */
export function blink(st: Stage, a: Actor) {
  a.blinkUntil = st.now + 420
  return st.wait(420)
}

// ─── intro, send-out, recall, faint ───

/** Venetian-blind curtain opening (stepped, 8px bands). */
function curtain(st: Stage, ms: number) {
  return st.paint(ms, 9, (ctx, k) => {
    const band = 8
    const h = Math.round(band * (1 - ease.inOut(k)))
    if (h <= 0) return
    ctx.fillStyle = '#000'
    for (let y = 0; y < st.geo.H; y += band) ctx.fillRect(0, y + Math.floor((band - h) / 2), st.geo.W, h)
  })
}

/** Platforms slide in from opposite sides while the camera settles; the foe (if any) is a dark silhouette. */
export async function slideIn(st: Stage, withFoe: boolean) {
  const W = st.geo.W
  st.pads.foe = st.pads.me = true
  st.slide.foe = -W
  st.slide.me = W
  if (withFoe) {
    st.foe.visible = true
    st.foe.sil = '#1c1238'
  }
  void curtain(st, 520)
  await st.tween(
    950,
    (k) => {
      st.slide.foe = Math.round(-W * (1 - k))
      st.slide.me = Math.round(W * (1 - k))
      st.camX = Math.round(30 * (1 - k))
    },
    ease.cubicOut,
  )
}

/** Wild encounter reveal: silhouette flashes white, then colour floods in with a sparkle. */
export async function reveal(st: Stage, a: Actor) {
  a.sil = WHITE_SIL
  await st.wait(90)
  a.sil = null
  a.flashCol = '#ffffff'
  const c = a.center()
  sparkles(st, c.x + a.w * 0.3, c.top + 8, 1, 4)
  await st.tween(
    360,
    (k) => {
      a.flash = 1 - k
    },
    ease.out,
  )
}

export function trainerIn(st: Stage) {
  st.trainer.visible = true
}

export function trainerOut(st: Stage) {
  const W = st.geo.W
  return st
    .tween(
      480,
      (k) => {
        st.trainer.dx = Math.round(k * (W - st.trainer.x + 60))
      },
      ease.in,
    )
    .then(() => {
      st.trainer.visible = false
    })
}

export function trainerBack(st: Stage) {
  const W = st.geo.W
  st.trainer.visible = true
  return st.tween(
    620,
    (k) => {
      st.trainer.dx = Math.round((1 - k) * (W - st.trainer.x + 60))
    },
    ease.cubicOut,
  )
}

/** Cold Wallet spinning along a parabola; resolves on arrival (the wallet particle is removed). */
function toss(
  st: Stage,
  img: HTMLCanvasElement,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  arc: number,
  ms: number,
) {
  let px = x0
  let py = y0
  let spin = 0
  const done = st.paint(ms, 1.5, (ctx) => {
    const w = Math.max(2, Math.round(img.width * Math.abs(Math.cos(spin))))
    ctx.drawImage(img, Math.round(px - w / 2), Math.round(py - img.height / 2), w, img.height)
  })
  return Promise.all([
    done,
    st.tween(ms, (k) => {
      px = x0 + (x1 - x0) * k
      py = y0 + (y1 - y0) * k - Math.sin(Math.PI * k) * arc
      spin = k * Math.PI * 4
    }),
  ])
}

function openFlash(st: Stage, x: number, y: number, col: Col = BLUE[3]) {
  st.add(new Particle(impact(16, col), x, y, { life: 0.3, fps: 10, loop: false, fade: 'none', z: 1.5 }))
  st.add(
    new Particle(
      [8, 12, 16, 20, 24, 28, 32].map((r) => ring(r, hex('#ffffff'))),
      x,
      y,
      { life: 0.35, fps: 20, loop: false, fade: 'none' },
    ),
  )
  const f = [dot(2, '#ffffff'), dot(2, css(col)), dot(1, '#ffffff')]
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2
    const sp = 60 + rand() * 50
    st.add(
      new Particle(f, x, y, {
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 20,
        ay: 120,
        drag: 2,
        life: 0.5,
        fps: 8,
      }),
    )
  }
}

/** The Remy pops out of a thrown Cold Wallet as a white silhouette and grows into colour. */
export async function sendOut(st: Stage, a: Actor) {
  a.visible = false
  a.sil = null
  a.sink = 0
  a.dx = a.dy = 0
  a.sx = a.sy = 1
  a.alpha = 1
  const mine = a.who === 'me'
  const c = { x: a.x, y: a.feet - a.h * 0.45 }
  const w = wallet()
  await toss(st, w.closed, mine ? -12 : st.geo.W + 12, mine ? c.y - 50 : c.y - 30, c.x, c.y, mine ? 36 : 28, 480)
  st.add(new Particle([w.open], c.x, c.y, { life: 0.25, fade: 'out', z: 1.5 }))
  openFlash(st, c.x, c.y)
  void st.flash('#ffffff', 0.35, 220)
  a.visible = true
  a.sil = WHITE_SIL
  await st.tween(
    300,
    (k) => {
      const s = k < 0.7 ? 0.08 + (1.12 - 0.08) * (k / 0.7) : 1.12 - 0.12 * ((k - 0.7) / 0.3)
      a.sx = a.sy = s
      a.dy = Math.round(-(1 - k) * a.h * 0.4)
    },
    ease.out,
  )
  a.sx = a.sy = 1
  a.dy = 0
  a.sil = null
  a.flashCol = '#ffffff'
  await st.tween(260, (k) => {
    a.flash = 1 - k
  })
}

/** Red recall beam: the Remy turns into light and zips back into its wallet. */
export async function recall(st: Stage, a: Actor) {
  const c = a.center()
  const col = hex('#ff5a6a')
  st.add(new Particle([beam(12, Math.round(a.h + 20), col)], c.x, c.y, { life: 0.42, fade: 'out', z: 1 }))
  a.sil = '#ff8a94'
  await st.tween(
    320,
    (k) => {
      a.sx = a.sy = 1 - 0.95 * k
      a.dy = -Math.round(a.h * 0.4 * k)
    },
    ease.in,
  )
  a.visible = false
  a.sil = null
  a.sx = a.sy = 1
  a.dy = 0
  const f = [dot(2, '#ffffff'), dot(2, '#ff5a6a')]
  const d = a.who === 'me' ? -1 : 1
  st.add(new Particle(f, c.x, c.y, { vx: d * 260, vy: -60, ay: 60, life: 0.5, fps: 16, z: 2 }))
}

/** GBA faint: the sprite drops through its pad line, kicking up dust. */
export async function faint(st: Stage, a: Actor) {
  a.blinkUntil = st.now + 240
  await st.wait(260)
  puff(st, a.x, a.feet, 6)
  await st.tween(
    380,
    (k) => {
      a.sink = k
    },
    ease.in,
  )
  a.visible = false
  a.sink = 0
}

export function runAway(st: Stage, a: Actor) {
  puff(st, a.x, a.feet, 5)
  return st.tween(
    420,
    (k) => {
      a.dx = -Math.round(st.geo.W * 0.7 * k)
    },
    ease.in,
  )
}

// ─── catching ───

/** Blocked throw at a trainer's Remy: bonks off and tumbles away. */
export async function deflect(st: Stage, premium: boolean) {
  const f = st.foe.center()
  const img = wallet(premium).closed
  await toss(st, img, -12, st.me.center().y - 20, f.x - 6, f.y, 34, 420)
  burst(st, f.x - 6, f.y, 'MEME')
  let px = f.x - 6
  let py = f.y
  await st.paint(420, 1.5, (ctx, k) => {
    px = f.x - 6 - 50 * k
    py = f.y - 60 * k + 90 * k * k
    const r = rotated(img, Math.round((k * 720) / 30) * 30)
    ctx.drawImage(r, Math.round(px - r.width / 2), Math.round(py - r.height / 2))
  })
}

/**
 * Full catch sequence up to the verdict: throw, beam the Remy in, drop, `shakes` wobbles, then either lock (stars;
 * the locked wallet stays on the pad) or break out (the Remy bursts back). Resolves when the verdict has played.
 */
export async function capture(st: Stage, premium: boolean, shakes: number, caught: boolean) {
  const a = st.foe
  const c = a.center()
  const w = wallet(premium)
  const hx = a.x
  const hy = Math.round(c.top - 6)
  await toss(st, w.closed, -12, st.me.center().y - 20, hx, hy, 36, 560)
  let img = w.open
  let wx = hx
  let wy = hy
  let rot = 0
  let live = true
  st.add({
    z: 1.5,
    update: () => live,
    draw: (ctx) => {
      const r = rot ? rotated(img, rot) : img
      ctx.drawImage(r, Math.round(wx - r.width / 2), Math.round(wy - r.height / 2))
    },
  })
  // Suction beam: the Remy whitens, shrinks toward the wallet mouth.
  st.add(
    new Particle([beam(Math.round(a.w * 0.7), Math.round(a.feet - hy), BLUE[3])], hx, (hy + a.feet) / 2, {
      life: 0.7,
      fade: 'out',
      z: -0.5,
    }),
  )
  a.sil = WHITE_SIL
  void st.flash('#ffffff', 0.3, 200)
  await st.wait(160)
  const top0 = hy
  await st.tween(
    380,
    (k) => {
      a.sx = a.sy = 1 - 0.97 * k
      a.dy = -Math.round((a.feet - top0) * k)
    },
    ease.in,
  )
  a.visible = false
  a.sil = null
  a.sx = a.sy = 1
  a.dy = 0
  img = w.closed
  // Drop to the pad with two bounces.
  const gy = a.feet - 7
  await st.tween(520, (k) => {
    const b =
      k < 0.55
        ? (k / 0.55) ** 2
        : k < 0.8
          ? 1 - Math.sin(((k - 0.55) / 0.25) * Math.PI) * 0.18
          : 1 - Math.sin(((k - 0.8) / 0.2) * Math.PI) * 0.05
    wy = Math.round(hy + (gy - hy) * b)
  })
  puff(st, wx, a.feet, 3)
  await st.wait(360)
  for (let i = 0; i < shakes; i++) {
    await st.tween(520, (k) => {
      rot = Math.round((Math.sin(k * Math.PI * 2) * (k < 0.5 ? 24 : 16)) / 8) * 8
      wx = hx + Math.round(Math.sin(k * Math.PI * 2) * 2)
    })
    rot = 0
    wx = hx
    await st.wait(i < shakes - 1 ? 380 : 260)
  }
  if (caught) {
    img = w.locked
    const s = star()
    for (let i = 0; i < 3; i++) {
      const ang = -Math.PI / 2 + (i - 1) * 0.75
      st.add(
        new Particle([s], wx, wy - 4, {
          vx: Math.cos(ang) * 55,
          vy: Math.sin(ang) * 70,
          ay: 110,
          life: 0.9,
          z: 2,
          fade: 'blink',
        }),
      )
    }
    sparkles(st, wx, wy - 8, 4, 20)
    // The locked wallet (dimmed LED) stays on the pad for the rest of the scene.
    await st.wait(600)
    return
  }
  live = false
  openFlash(st, wx, wy)
  a.visible = true
  a.sil = WHITE_SIL
  await st.tween(
    340,
    (k) => {
      a.sx = a.sy = k < 0.7 ? 0.05 + 1.05 * (k / 0.7) : 1.1 - 0.1 * ((k - 0.7) / 0.3)
    },
    ease.out,
  )
  a.sx = a.sy = 1
  a.sil = null
  a.flashCol = '#ffffff'
  await st.tween(200, (k) => {
    a.flash = 1 - k
  })
}

// ─── celebrations ───

export async function goldBurst(st: Stage, a: Actor) {
  const c = a.center()
  a.flashCol = '#fff3b0'
  void st.tween(700, (k) => {
    a.flash = Math.sin(k * Math.PI) * 0.8
  })
  const f = twinkle(hex('#ffd34d'))
  for (let i = 0; i < 14; i++) {
    const ang = (i / 14) * Math.PI * 2
    const sp = 40 + rand() * 30
    st.add(
      new Particle(f, c.x, c.y, {
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        drag: 2.5,
        life: 0.9,
        fps: 12,
        z: 2,
        delay: rand() * 0.15,
      }),
    )
  }
  await st.wait(700)
}

export function coinShower(st: Stage) {
  const g = st.geo.foe
  for (let i = 0; i < 16; i++)
    st.add(
      new Particle(coin(), g.x + (rand() - 0.5) * 70, -8 - rand() * 30, {
        vy: 40 + rand() * 30,
        ay: 260,
        life: 1.1,
        fps: 14,
        delay: i * 0.05,
        z: 2,
      }),
    )
}

export async function levelUp(st: Stage, a: Actor) {
  const c = a.center()
  const col = hex('#ffe066')
  st.add(
    new Particle([beam(Math.round(a.w + 10), Math.round(a.h + 30), col)], c.x, c.y - 10, {
      life: 0.9,
      fade: 'out',
      z: -0.5,
    }),
  )
  a.flashCol = '#fff6b0'
  void st.tween(900, (k) => {
    a.flash = Math.abs(Math.sin(k * Math.PI * 3)) * 0.75
  })
  const rings = [ring(Math.round(a.w * 0.5), col, 0.3)]
  for (let i = 0; i < 3; i++)
    st.add(new Particle(rings, c.x, a.feet, { vy: -a.h * 1.1, life: 0.7, delay: i * 0.2, z: 1 }))
  sparkles(st, c.x, c.y, 10, a.w * 1.2, col)
  await st.wait(900)
}

// ─── heal / drain / stats ───

export async function heal(st: Stage, a: Actor) {
  const c = a.center()
  a.flashCol = '#7dffb1'
  void st.tween(700, (k) => {
    a.flash = Math.sin(k * Math.PI) * 0.6
  })
  for (let i = 0; i < 10; i++)
    st.add(
      new Particle([plus()], c.x + (rand() - 0.5) * a.w * 1.1, a.feet - rand() * a.h * 0.4, {
        vy: -40 - rand() * 20,
        life: 0.8,
        delay: i * 0.05,
        z: 2,
      }),
    )
  sparkles(st, c.x, c.y, 5, a.w, hex('#7dffb1'))
  await st.wait(560)
}

export async function drain(st: Stage, from: Actor, to: Actor) {
  const a = from.center()
  const b = to.center()
  const f = orb()
  const all: Promise<void>[] = []
  for (let i = 0; i < 7; i++) {
    const sx = a.x + (rand() - 0.5) * a.w * 0.6
    const sy = a.y + (rand() - 0.5) * a.h * 0.5
    const bend = (rand() - 0.5) * 60
    all.push(
      st.wait(i * 70).then(() =>
        st.paint(640, 2, (ctx, k) => {
          const e = ease.inOut(k)
          const x = sx + (b.x - sx) * e + Math.sin(e * Math.PI) * bend
          const y = sy + (b.y - sy) * e - Math.sin(e * Math.PI) * 26
          const img = f[Math.floor(k * 10) % 2]
          ctx.drawImage(img, Math.round(x - 4), Math.round(y - 4))
        }),
      ),
    )
  }
  await Promise.all(all)
  to.flashCol = '#7dffb1'
  void st.tween(300, (k) => {
    to.flash = (1 - k) * 0.7
  })
}

/** Scrolling arrows masked to the sprite (the GBA stat-change look) plus per-move flourishes. */
export async function stat(st: Stage, a: Actor, up: boolean, id: Id) {
  const c = a.center()
  const ramp = up ? (id === 'pump_it' ? RED : BLUE) : PURPLE
  const off = canvas(1, 1)
  const octx = ctx2d(off)
  const arr = arrow(up, ramp)
  let strength = 0
  a.overlay = (ctx, img, x, y, t) => {
    if (off.width !== img.width || off.height !== img.height) {
      off.width = img.width
      off.height = img.height
    }
    octx.globalCompositeOperation = 'source-over'
    octx.clearRect(0, 0, off.width, off.height)
    const step = 12
    const scroll = Math.floor((t / 16) % step) * (up ? -1 : 1)
    for (let yy = -step; yy < off.height + step; yy += step)
      for (let xx = ((yy / step) % 2) * 6 - 6; xx < off.width; xx += 12) octx.drawImage(arr, xx, yy + scroll)
    octx.globalCompositeOperation = 'destination-in'
    octx.drawImage(img, 0, 0)
    ctx.globalAlpha = strength
    ctx.drawImage(off, x, y)
    ctx.globalAlpha = 1
  }
  const flourish = statFlourish(st, a, id)
  await st.tween(900, (k) => {
    strength = Math.min(1, Math.sin(k * Math.PI) * 1.6) * 0.85
  })
  a.overlay = null
  for (let i = 0; i < 6; i++)
    st.add(
      new Particle([arr], c.x + (rand() - 0.5) * a.w, up ? a.feet - 4 : c.top, {
        vy: up ? -70 : 60,
        life: 0.45,
        delay: i * 0.05,
        z: 2,
      }),
    )
  await flourish
}

async function statFlourish(st: Stage, a: Actor, id: Id) {
  const c = a.center()
  if (id === 'fud') {
    const f = cloud(Math.min(44, Math.max(30, Math.round(a.w * 0.8))))
    st.add(new Particle([f[0], f[0], f[0], f[1], f[0], f[1]], c.x, c.top - 12, { life: 1.1, fps: 8, z: 2 }))
    for (let i = 0; i < 12; i++)
      st.add(
        new Particle([dot(1, '#b35cff'), dot(1, '#7a5cff')], c.x + (rand() - 0.5) * a.w * 0.8, c.top - 2, {
          vy: 90,
          life: 0.5,
          delay: 0.1 + i * 0.05,
          z: 2,
        }),
      )
    st.add(new Particle([word('FUD', hex('#d9a6ff'))], c.x, c.top - 26, { life: 1, fade: 'blink', z: 2 }))
  } else if (id === 'paper_hands') {
    for (let i = 0; i < 7; i++)
      st.add(
        new Particle([paper(), rotated(paper(), 30), rotated(paper(), -30)], c.x + (rand() - 0.5) * a.w, c.top - 10, {
          vy: 30,
          vx: (rand() - 0.5) * 20,
          life: 1,
          fps: 6,
          delay: i * 0.08,
          z: 2,
        }),
      )
  } else if (id === 'diamond_hands') {
    await st.paint(900, 2, (ctx, k) => {
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 + k * Math.PI * 2
        const g = gem()
        const r = a.w * 0.55
        if (k > 0.85 && i % 2) continue
        ctx.drawImage(g, Math.round(c.x + Math.cos(ang) * r - 5), Math.round(c.y + Math.sin(ang) * r * 0.4 - 5))
      }
    })
  } else if (id === 'pump_it') {
    st.add(new Particle([word('PUMP!', hex('#ffb03a'), 2)], c.x, c.top - 10, { vy: -10, life: 1, z: 2, fade: 'out' }))
    const f = [dot(2, '#ffe066'), dot(2, '#ff9d2e'), dot(1, '#ec4a4a')]
    for (let i = 0; i < 16; i++)
      st.add(
        new Particle(f, c.x + (rand() - 0.5) * a.w, a.feet - rand() * 6, {
          vy: -50 - rand() * 40,
          life: 0.6,
          fps: 6,
          loop: false,
          delay: rand() * 0.4,
          z: 1,
        }),
      )
  }
}

// ─── attack FX ───

export function moveFx(st: Stage, id: Id, mv: Move, att: Actor, def: Actor): Promise<void> {
  switch (id) {
    case 'green_candle':
      return greenCandle(st, def, 6)
    case 'bull_run':
      return bullRun(st, att, def)
    case 'to_the_moon':
      return toTheMoon(st, def)
    case 'red_candle':
      return redCandles(st, def)
    case 'wick_hunt':
      return wickHunt(st, def)
    case 'capitulation':
      return capitulation(st, def)
    case 'splash':
      return splash(st, def, false)
    case 'yield_farm':
      return splash(st, def, true)
    case 'tsunami_sell':
      return tsunami(st, att, def)
    case 'ape_in':
      return apeIn(st, att, def, false)
    case 'leverage':
      return apeIn(st, att, def, true)
    case 'rug_pull':
      return rugPull(st, att, def)
    case 'flash_loan':
      return flashLoan(st, att, def)
    default:
      return memes(st, def, id, mv.type)
  }
}

async function greenCandle(st: Stage, t: Actor, n: number) {
  const c = t.center()
  void wash(st, '#0d3d24', 0.28, 900)
  const all: Promise<void>[] = []
  for (let i = 0; i < n; i++) {
    const h = Math.round(t.h * (0.25 + rand() * 0.3))
    const img = candle(h, true, 5)
    const x = Math.round(c.x + (i / (n - 1) - 0.5) * t.w * 1.2 + (rand() - 0.5) * 4)
    const base = t.feet + 2
    all.push(
      st.wait(i * 45).then(() =>
        st.paint(560, i % 2 ? -0.5 : 1, (ctx, k) => {
          // Grows out of the ground, then shoots up.
          const grow = Math.min(1, k / 0.35)
          const vis = Math.round(img.height * grow)
          const lift = k > 0.35 ? Math.round(((k - 0.35) / 0.65) ** 2 * t.h * 0.9) : 0
          ctx.globalAlpha = k > 0.8 ? (1 - k) * 5 : 1
          ctx.drawImage(img, 0, 0, img.width, vis, x - (img.width >> 1), base - vis - lift, img.width, vis)
          ctx.globalAlpha = 1
        }),
      ),
    )
  }
  for (let i = 0; i < 3; i++)
    st.add(
      new Particle([chevron(true, 15, GREEN)], c.x, t.feet - 4, { vy: -120, life: 0.45, delay: 0.15 + i * 0.1, z: 2 }),
    )
  await st.wait(360)
  burst(st, c.x, c.y, 'BULL')
}

async function bullRun(st: Stage, att: Actor, t: Actor) {
  const c = t.center()
  const d = att.who === 'me' ? 1 : -1
  void wash(st, '#0d3d24', 0.3, 1000)
  puff(st, att.x, att.feet, 6)
  // A stampede of candles charges across the target's row.
  for (let i = 0; i < 9; i++) {
    const h = 10 + Math.round(rand() * 16)
    st.add(
      new Particle([candle(h, true, 5)], c.x - d * (80 + i * 14), t.feet - h / 2 - 2 - rand() * 10, {
        vx: d * 420,
        life: 0.55,
        z: i % 2 ? -0.5 : 1,
        fade: 'out',
      }),
    )
  }
  await st.wait(220)
  for (let i = 0; i < 3; i++) {
    await st.wait(70)
    burst(st, c.x + (rand() - 0.5) * t.w, c.y + (rand() - 0.5) * t.h * 0.5, 'BULL')
    st.shake(2, 120)
  }
  puff(st, c.x, t.feet, 5)
}

async function toTheMoon(st: Stage, t: Actor) {
  const c = t.center()
  void wash(st, '#0a0a2e', 0.55, 1500)
  const m = moon(14)
  void st.paint(1400, -0.8, (ctx, k) => {
    const y = -20 + ease.cubicOut(Math.min(1, k * 1.6)) * (st.geo.horizon * 0.55 + 20)
    ctx.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1
    ctx.drawImage(m, Math.round(st.geo.W * 0.5 - m.width / 2), Math.round(y))
    ctx.globalAlpha = 1
  })
  sparkles(st, st.geo.W / 2, st.geo.horizon * 0.4, 8, st.geo.W * 0.8, undefined, -0.7)
  // A towering candle erupts under the target and flings it skyward.
  const big = candle(Math.round(t.h * 0.9), true, 9)
  void st.paint(700, -0.5, (ctx, k) => {
    const vis = Math.round(big.height * Math.min(1, k / 0.3))
    ctx.globalAlpha = k > 0.75 ? (1 - k) * 4 : 1
    ctx.drawImage(big, 0, 0, big.width, vis, Math.round(c.x - big.width / 2), t.feet + 2 - vis, big.width, vis)
    ctx.globalAlpha = 1
  })
  await st.wait(160)
  await st.tween(
    420,
    (k) => {
      t.dy = -Math.round(Math.sin(k * Math.PI * 0.5) * 60)
    },
    ease.out,
  )
  for (let i = 0; i < 3; i++)
    st.add(new Particle([chevron(true, 19, GREEN)], c.x, t.feet - 10, { vy: -160, life: 0.4, delay: i * 0.08, z: 2 }))
  await st.tween(220, (k) => {
    t.dy = -Math.round((1 - k * k) * 60)
  })
  t.dy = 0
  st.shake(4, 360)
  puff(st, c.x, t.feet, 8)
  burst(st, c.x, c.y, 'BULL', true)
}

async function redCandles(st: Stage, t: Actor) {
  const c = t.center()
  void wash(st, '#3a0010', 0.28, 900)
  for (let i = 0; i < 6; i++) {
    const h = Math.round(t.h * (0.2 + rand() * 0.2))
    const x = c.x + (rand() - 0.5) * t.w * 1.1
    st.add(
      new Particle([candle(h, false, 5)], x, -h - rand() * 20, {
        vy: 260,
        ay: 600,
        life: 0.5,
        delay: i * 0.05,
        z: i % 2 ? 1 : -0.5,
      }),
    )
  }
  await st.wait(380)
  burst(st, c.x, c.y, 'BEAR')
}

async function wickHunt(st: Stage, t: Actor) {
  const c = t.center()
  void wash(st, '#3a0010', 0.32, 900)
  for (let i = 0; i < 3; i++) {
    const oy = (i - 1) * 9
    const len = Math.round(t.w * 1.1)
    const x0 = c.x + len / 2 + oy * 0.4
    const y0 = c.y - len / 2 + oy
    await st.wait(i ? 90 : 0)
    void st.paint(260, 1.5, (ctx, k) => {
      const head = Math.min(1, k / 0.4)
      const tail = k > 0.4 ? (k - 0.4) / 0.6 : 0
      for (let s = tail * len; s < head * len; s++) {
        const x = Math.round(x0 - s)
        const y = Math.round(y0 + s)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(x, y, 1, 1)
        ctx.fillStyle = css(RED[2])
        ctx.fillRect(x + 1, y, 1, 1)
        ctx.fillRect(x, y - 1, 1, 1)
        ctx.fillStyle = css(RED[0])
        ctx.fillRect(x + 1, y + 1, 1, 1)
      }
    })
    st.freeze(40)
    st.shake(1.5, 100)
  }
  await st.wait(220)
  burst(st, c.x, c.y, 'BEAR')
}

async function capitulation(st: Stage, t: Actor) {
  const c = t.center()
  void wash(st, '#1a0008', 0.6, 1400)
  const img = candle(Math.round(t.h * 1.05), false, 17)
  const land = t.feet - img.height / 2 + 4
  let y = -img.height
  void st.paint(1100, 1, (ctx, k) => {
    ctx.globalAlpha = k > 0.8 ? (1 - k) * 5 : 1
    ctx.drawImage(img, Math.round(c.x - img.width / 2), Math.round(y - img.height / 2))
    ctx.globalAlpha = 1
  })
  await st.tween(
    380,
    (k) => {
      y = -img.height + (land + img.height) * k
    },
    ease.in,
  )
  st.freeze(110)
  st.shake(6, 520)
  void st.flash('#ff2a3a', 0.45, 260)
  const f = [dot(2, '#9a1e34'), dot(2, '#4a0a18'), dot(1, '#ec4a4a')]
  for (let i = 0; i < 18; i++)
    st.add(
      new Particle(f, c.x + (rand() - 0.5) * 20, t.feet, {
        vx: (rand() - 0.5) * 160,
        vy: -60 - rand() * 90,
        ay: 300,
        life: 0.7,
        fps: 5,
        z: 1.5,
      }),
    )
  burst(st, c.x, c.y + t.h * 0.2, 'BEAR', true)
}

async function splash(st: Stage, t: Actor, small: boolean) {
  const c = t.center()
  void wash(st, '#0a2a66', small ? 0.2 : 0.28, 900)
  const d = drop()
  for (let i = 0; i < (small ? 10 : 18); i++)
    st.add(
      new Particle([d], c.x + (rand() - 0.5) * 10, t.feet - 4, {
        vx: (rand() - 0.5) * 140,
        vy: -120 - rand() * 120,
        ay: 420,
        life: 0.8,
        z: i % 3 ? 1 : -0.5,
      }),
    )
  const ripple = [8, 12, 16, 20, 24, 28, 32].map((r) => ring(r, BLUE[3], 0.3))
  for (let i = 0; i < 2; i++)
    st.add(new Particle(ripple, c.x, t.feet, { life: 0.5, fps: 14, loop: false, delay: i * 0.18, z: -0.5 }))
  await st.wait(260)
  burst(st, c.x, c.y, 'WHALE')
}

async function tsunami(st: Stage, att: Actor, t: Actor) {
  const c = t.center()
  const d = att.who === 'me' ? 1 : -1
  void wash(st, '#051a4a', 0.45, 1500)
  const ww = Math.round(st.geo.W * 0.8)
  const wh = Math.round(Math.min(Math.max(52, t.h * 1.5), st.geo.field * 0.85))
  const frames = wave(ww, wh)
  const x0 = d > 0 ? -ww : st.geo.W + ww
  // The curl (at 70% of the wave's width) comes to rest just over the target.
  const x1 = c.x - d * ww * 0.12
  let x = x0
  void st.paint(1100, 1, (ctx, k) => {
    const f = frames[Math.floor(k * 20) % 4]
    ctx.globalAlpha = k > 0.75 ? (1 - k) * 4 : 1
    if (d > 0) ctx.drawImage(f, Math.round(x - ww / 2), t.feet + 6 - wh)
    else {
      ctx.save()
      ctx.translate(Math.round(x + ww / 2), 0)
      ctx.scale(-1, 1)
      ctx.drawImage(f, 0, t.feet + 6 - wh)
      ctx.restore()
    }
    ctx.globalAlpha = 1
  })
  await st.tween(
    520,
    (k) => {
      x = x0 + (x1 - x0) * k
    },
    ease.out,
  )
  st.shake(4, 420)
  for (let i = 0; i < 10; i++)
    st.add(
      new Particle(coin(), c.x + (rand() - 0.5) * t.w * 1.4, c.top - 30 - rand() * 20, {
        vy: 60,
        ay: 300,
        life: 0.8,
        delay: i * 0.04,
        z: 2,
      }),
    )
  const dr = drop()
  for (let i = 0; i < 14; i++)
    st.add(
      new Particle([dr], c.x + (rand() - 0.5) * t.w, c.y, {
        vx: (rand() - 0.5) * 160,
        vy: -100 - rand() * 100,
        ay: 420,
        life: 0.7,
        z: 1.5,
      }),
    )
  burst(st, c.x, c.y, 'WHALE', true)
}

async function apeIn(st: Stage, att: Actor, t: Actor, lev: boolean) {
  const a = att.center()
  const b = t.center()
  void wash(st, '#1a0630', lev ? 0.4 : 0.25, 1000)
  const frames = rocket()
  const scale = lev ? 2 : 1
  const dx = b.x - a.x
  const dy = b.y - a.y
  await st.paint(440, 1.5, (ctx, k) => {
    const e = ease.in(k)
    const x = a.x + dx * e
    const y = a.y + dy * e - Math.sin(Math.PI * e) * 24
    const slope = Math.atan2(dy - 24 * Math.PI * Math.cos(Math.PI * e), dx)
    const deg = Math.round((slope * 180) / Math.PI / 15) * 15
    const img = rotated(frames[Math.floor(k * 16) % 2], deg)
    const w = img.width * scale
    const h = img.height * scale
    ctx.drawImage(img, Math.round(x - w / 2), Math.round(y - h / 2), w, h)
    if (Math.floor(k * 30) % 2 === 0)
      st.add(
        new Particle([dot(2, '#c8c0d8'), dot(1, '#8a82a0')], x, y, { vy: -10, life: 0.35, fps: 6, loop: false, z: 1 }),
      )
  })
  st.glitchUntil = st.now + (lev ? 420 : 260)
  t.glitchUntil = st.now + 480
  st.shake(lev ? 4 : 2, 300)
  const cols = ['#b35cff', '#ff4fa0', '#7dffb1', '#ffe066', '#ffffff']
  for (let i = 0; i < 20; i++) {
    const ang = rand() * Math.PI * 2
    const sp = 50 + rand() * 90
    st.add(
      new Particle([dot(2, cols[i % cols.length])], b.x, b.y, {
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 30,
        ay: 200,
        life: 0.6,
        z: 1.5,
      }),
    )
  }
  if (lev)
    st.add(new Particle([word('100X', hex('#ff4fa0'), 3)], b.x, b.top - 8, { vy: -12, life: 0.9, z: 2, fade: 'blink' }))
  burst(st, b.x, b.y, 'DEGEN', lev)
}

async function rugPull(st: Stage, att: Actor, t: Actor) {
  const c = t.center()
  const d = att.who === 'me' ? -1 : 1
  void wash(st, '#1a0630', 0.35, 1300)
  const img = rug(Math.round(t.w * 1.3))
  let rx = 0
  let skew = 0
  void st.paint(900, -0.6, (ctx, k) => {
    ctx.globalAlpha = k < 0.15 ? k / 0.15 : k > 0.7 ? (1 - k) / 0.3 : 1
    const y = t.feet - 3
    // Yanked rug: the leading edge stretches in 3 steps (no smooth skew in pixel land).
    for (let s = 0; s < 3; s++)
      ctx.drawImage(
        img,
        0,
        s * 3,
        img.width,
        3,
        Math.round(c.x - img.width / 2 + rx + skew * s),
        y + s * 3,
        img.width,
        3,
      )
    ctx.globalAlpha = 1
  })
  await st.wait(260)
  st.glitchUntil = st.now + 380
  void st.tween(
    280,
    (k) => {
      rx = Math.round(d * k * st.geo.W * 0.6)
      skew = Math.round(d * k * 6)
    },
    ease.in,
  )
  // The target is flipped off its feet, spins, and crashes.
  await st.tween(520, (k) => {
    t.dy = -Math.round(Math.sin(k * Math.PI) * 26)
    t.sx = Math.max(0.1, Math.abs(Math.cos(k * Math.PI * 2)))
    t.dx = Math.round(d * 6 * Math.sin(k * Math.PI))
  })
  t.sx = 1
  t.dy = t.dx = 0
  t.glitchUntil = st.now + 400
  st.shake(4, 380)
  puff(st, c.x, t.feet, 8)
  burst(st, c.x, c.y, 'DEGEN', true)
}

async function flashLoan(st: Stage, att: Actor, t: Actor) {
  const a = att.center()
  const b = t.center()
  void wash(st, '#2a1a00', 0.22, 700)
  // Afterimages trail the dash.
  for (let i = 1; i <= 4; i++) {
    const k = i / 5
    const x = a.x + (b.x - a.x) * k * 0.6
    const y = a.y + (b.y - a.y) * k * 0.6
    const img = att.frame(st.now)
    if (!img) break
    const g = silhouette(img, '#ffd34d')
    st.add(
      new Particle([g], x, y + img.height / 2 + att.h / 2 - att.feetRow, {
        life: 0.3,
        delay: i * 0.03,
        fade: 'out',
        z: 0.5,
      }),
    )
  }
  await st.paint(160, 1.5, (ctx, k) => {
    const n = Math.round(Math.hypot(b.x - a.x, b.y - a.y))
    for (let s = 0; s < n * k; s++) {
      const u = s / n
      const x = Math.round(a.x + (b.x - a.x) * u)
      const y = Math.round(a.y + (b.y - a.y) * u)
      ctx.fillStyle = s % 3 ? '#ffd34d' : '#ffffff'
      ctx.fillRect(x, y - 1, 1, 3)
    }
  })
  for (let i = 0; i < 8; i++) {
    const ang = rand() * Math.PI * 2
    st.add(
      new Particle(coin(), b.x, b.y, {
        vx: Math.cos(ang) * 90,
        vy: Math.sin(ang) * 70 - 40,
        ay: 240,
        life: 0.7,
        fps: 14,
        z: 1.5,
      }),
    )
  }
  st.add(
    new Particle([bubble('REPAID', false)], b.x + (t.who === 'foe' ? -20 : 20), b.top - 4, { vy: -8, life: 0.8, z: 2 }),
  )
  burst(st, b.x, b.y, 'MEME')
}

async function memes(st: Stage, t: Actor, id: Id, type: RType) {
  const c = t.center()
  const words =
    id === 'ratio'
      ? ['RATIO', '+L', 'COPE']
      : id === 'shill'
        ? ['SHILL!', 'GM!', 'WAGMI']
        : id === 'panic'
          ? ['SELL!!', 'REKT', 'NGMI']
          : ['LOL', 'GM', 'LFG']
  void wash(st, id === 'panic' ? '#3a0010' : '#2a1a00', 0.2, 800)
  const spots = [
    [-0.55, 0.05],
    [0.55, 0.2],
    [0, -0.35],
  ]
  words.forEach((w, i) => {
    const img = bubble(w, id === 'panic')
    const x = c.x + spots[i][0] * t.w
    const y = c.top + t.h * (0.25 + spots[i][1])
    void st.wait(i * 110).then(() =>
      st.paint(780, 2, (ctx, k) => {
        // Pop: 1 frame squashed, 1 frame overshoot, then a slow float up and blink out.
        const s = k < 0.06 ? 0.5 : k < 0.12 ? 1.15 : 1
        const bw = Math.round(img.width * s)
        const bh = Math.round(img.height * s)
        if (k > 0.8 && Math.floor(k * 40) % 2) return
        ctx.drawImage(img, Math.round(x - bw / 2), Math.round(y - bh / 2 - k * 6), bw, bh)
      }),
    )
  })
  sparkles(st, c.x, c.y, 6, t.w * 1.2, TYPE_RAMP[type][3], 2)
  await st.wait(330)
  burst(st, c.x, c.y, type)
}
