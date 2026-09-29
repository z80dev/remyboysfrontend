/**
 * Battle splash screens drawn as low-res pixel art: trainer versus, Cabald propaganda, the denial breaking and the
 * mint certificate keepsake. Every canvas is sized 1 canvas px = 1rem = 1 logical game pixel, and sprites are only
 * ever drawn at integer scales, so the art stays as crisp as the overworld.
 */
import { SPRITE_H, SPRITE_W, art } from '../art'
import { audio } from '../audio'
import { type Remy, TYPE_COLOR, remyName, species } from '../data'
import { BASE, OUT } from '../gfx/palette'
import { type Col, Px, canvas, css, ctx2d, hash, hex, mix, text as pxText, ramp, rng, shade, textWidth } from '../gfx/px'
import { input } from '../input'
import { el, sleep } from '../ui'
import { view } from '../view'
import './splash.css'

export interface SplashTrainer {
  name: string
  title: string
  portrait: number
}

type G = CanvasRenderingContext2D

/** How long every splash spends on its venetian-blind exit. */
const OUT_MS = 240
const INK = css(OUT)
const WHITE = '#ffffff'

interface Stage {
  wrap: HTMLElement
  g: G
  W: number
  H: number
}

function stage(root: HTMLElement, cls: string): Stage {
  const W = view.W
  const H = view.H
  const wrap = el('div', `sp ${cls}`)
  wrap.style.width = `${W}rem`
  wrap.style.height = `${H}rem`
  const cv = canvas(W, H)
  cv.className = 'sp-cv'
  cv.style.width = `${W}rem`
  cv.style.height = `${H}rem`
  wrap.append(cv)
  root.append(wrap)
  return { wrap, g: ctx2d(cv), W, H }
}

/** Drives `frame(t)` every animation frame for `total` ms; the final call always receives exactly `total`. */
function play(total: number, frame: (t: number) => void): Promise<void> {
  return new Promise((done) => {
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = now - t0
      frame(Math.min(t, total))
      if (t >= total) done()
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

/** Venetian-blind wipe that reveals the battle underneath in 8px slats (p: 0 → 1). */
function blinds(g: G, W: number, H: number, p: number) {
  if (p <= 0) return
  const k = Math.min(8, Math.ceil(p * 8))
  for (let y = 0; y < H; y += 8) g.clearRect(0, y, W, k)
}

const easeOut = (x: number) => 1 - (1 - Math.max(0, Math.min(1, x))) ** 3
const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

/** 2×2 checkerboard pattern: the GBA way to blend two colours (or a colour over transparency) without gradients. */
function checker(g: G, a: string, b: string | null): CanvasPattern {
  const c = canvas(2, 2)
  const x = ctx2d(c)
  x.fillStyle = a
  x.fillRect(0, 0, 1, 1)
  x.fillRect(1, 1, 1, 1)
  if (b) {
    x.fillStyle = b
    x.fillRect(1, 0, 1, 1)
    x.fillRect(0, 1, 1, 1)
  }
  return g.createPattern(c, 'repeat') as CanvasPattern
}

/** Row fill styles stepping through a ramp with a dithered row between neighbours: [c0, c0/c1, c1, …]. */
function bandStyles(g: G, cols: Col[]): (string | CanvasPattern)[] {
  const out: (string | CanvasPattern)[] = []
  for (let i = 0; i < cols.length; i++) {
    out.push(css(cols[i]))
    if (i < cols.length - 1) out.push(checker(g, css(cols[i]), css(cols[i + 1])))
  }
  return out
}

function silhouette(src: HTMLCanvasElement, color = WHITE): HTMLCanvasElement {
  const c = canvas(src.width, src.height)
  const x = ctx2d(c)
  x.drawImage(src, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = color
  x.fillRect(0, 0, c.width, c.height)
  return c
}

function scaled(src: HTMLCanvasElement, k: number): HTMLCanvasElement {
  const c = canvas(src.width * k, src.height * k)
  ctx2d(c).drawImage(src, 0, 0, c.width, c.height)
  return c
}

/** Loads a battle sprite with its white flash frame (never mirrored: shirt text is part of the art). */
async function spritePair(idx: number) {
  const img = await art.sprite(idx)
  return { img, flash: silhouette(img) }
}

/** Jagged screen-crack rays from (cx, cy): the boss variants' "this screen can't contain it" beat. */
function crackPaths(cx: number, cy: number, W: number, H: number, seed: number): [number, number][][] {
  const r = rng(seed)
  const rays: [number, number][][] = []
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + r() * 0.6
    const len = 50 + r() * Math.max(W, H) * 0.45
    const pts: [number, number][] = [[cx, cy]]
    let x = cx
    let y = cy
    for (let d = 0; d < len; d += 6 + r() * 8) {
      const j = a + (r() - 0.5) * 0.9
      x += Math.cos(j) * 9
      y += Math.sin(j) * 9
      pts.push([Math.round(x), Math.round(y)])
    }
    rays.push(pts)
  }
  return rays
}

/** Bresenham so crack lines are single hard pixels instead of anti-aliased strokes. */
function pixLine(g: G, x0: number, y0: number, x1: number, y1: number) {
  let x = x0
  let y = y0
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  for (;;) {
    g.fillRect(x, y, 1, 1)
    if (x === x1 && y === y1) return
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
}

function drawCracks(g: G, rays: [number, number][][], p: number) {
  for (const pts of rays) {
    const n = Math.ceil((pts.length - 1) * p)
    for (let i = 0; i < n; i++) {
      const [ax, ay] = pts[i]
      const [bx, by] = pts[i + 1]
      g.fillStyle = INK
      pixLine(g, ax + 1, ay + 1, bx + 1, by + 1)
      pixLine(g, ax + 2, ay + 1, bx + 2, by + 1)
      g.fillStyle = WHITE
      pixLine(g, ax, ay, bx, by)
      pixLine(g, ax + 1, ay, bx + 1, by)
    }
  }
}

/** Pixel plate (name/title) in DOM so Press Start 2P renders at an exact integer rem size. */
function plate(cls: string, name: string, title: string): HTMLElement {
  const p = el('div', `sp-plate ${cls}`)
  const b = el('b')
  b.textContent = name
  const s = el('small')
  s.textContent = title
  p.append(s, b)
  return p
}

function bar(cls: string, label: string): HTMLElement {
  // Press Start 2P is 8rem per glyph; narrow portrait screens fall back to the condensed pixel font.
  const b = el('div', `sp-bar ${cls}${label.length * 8 > view.W - 8 ? ' narrow' : ''}`)
  b.textContent = label
  return b
}

const HEART = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...']
function heart(color: string): HTMLCanvasElement {
  const p = new Px(7, 6)
  const c = hex(color)
  HEART.forEach((row, y) => {
    for (let x = 0; x < 7; x++) if (row[x] === '#') p.set(x, y, y === 1 && x === 1 ? shade(c, 0.6) : c)
  })
  const cv = p.toCanvas()
  cv.className = 'sp-heart'
  return cv
}

// ─── Versus ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** Chunky extruded 'VS': yellow→orange face, dark 3px extrusion, white then ink outline. */
function vsArt(): HTMLCanvasElement {
  const s = 6
  const p = new Px(textWidth('VS', s) + 10, 5 * s + 10)
  for (let i = 3; i >= 1; i--) pxText(p, 'VS', 4 + i, 4 + i, hex('#5a0f2a'), s)
  const face = hex('#fff27a')
  pxText(p, 'VS', 4, 4, face, s)
  const grad = [hex('#fffbd0'), hex('#fff27a'), hex('#ffd23a'), hex('#ff9b1f'), hex('#f0602a')]
  p.each((_x, y, c) => (c === face ? grad[Math.min(4, Math.floor(((y - 4) / (5 * s)) * 5))] : 0))
  p.outline(hex('#ffffff'))
  p.outline(OUT)
  return p.toCanvas()
}

/**
 * Two ramps slam in from opposite sides along a stepped 1:4 diagonal; sprites flash white then take colour; a
 * chunky VS slams with a two-frame shake. The boss version adds lightning, a red strobe and a cracked screen.
 */
export async function versusSplash(
  root: HTMLElement,
  o: { player: string; lead: number; trainer: SplashTrainer; boss: boolean },
): Promise<void> {
  const [me, foe] = await Promise.all([spritePair(o.lead), spritePair(o.trainer.portrait)])
  const { wrap, g, W, H } = stage(root, `sp-versus${o.boss ? ' boss' : ''}`)
  const total = o.boss ? 1900 : 1400
  const vs = vsArt()
  const vsFlash = silhouette(vs)
  const mid = H / 2
  // Seam: rival band above, player band below; x where the seam crosses row y (4px per row = clean stair steps).
  const xs = (y: number) => Math.round(W / 2 + 4 * (y - mid))
  const seamY = (x: number) => Math.round(mid + (x - W / 2) / 4)
  const rivalCols = o.boss
    ? ['#07040c', '#1a0812', '#3d0a1c', '#7a0f24', '#c41830'].map((c) => hex(c))
    : ramp(hex('#e0283a')).slice(0, 5)
  const meCols = BASE.slice(0, 5)
  const rivalRows = bandStyles(g, rivalCols)
  const meRows = bandStyles(g, meCols)
  const rivalLine = css(o.boss ? hex('#ff4a5a') : shade(hex('#e0283a'), 0.7))
  const meLine = css(BASE[5])
  const r = rng(o.trainer.portrait + 1)
  const lines = Array.from({ length: 26 }, (_, i) => ({
    rival: i % 2 === 0,
    u: r(),
    len: 14 + Math.floor(r() * 50),
    speed: 0.25 + r() * 0.45,
    x0: r() * 1000,
  }))
  // Final-position band masks: sprites are cropped by their own band like GBA trainer intros.
  const rivalClip = new Path2D()
  const meClip = new Path2D()
  for (let y = 0; y < H; y++) {
    const x = Math.max(0, Math.min(W, xs(y)))
    if (x < W) rivalClip.rect(x, y, W - x, 1)
    if (x > 0) meClip.rect(0, y, x, 1)
  }
  const foeX = W - SPRITE_W - Math.max(6, Math.floor(W * 0.06))
  const foeY = Math.max(14, seamY(foeX + SPRITE_W / 2) - SPRITE_H + 8)
  const meX = Math.max(6, Math.floor(W * 0.06))
  const meY = seamY(meX + SPRITE_W / 2) + 6
  const slam = o.boss ? 420 : 340
  const cracks = o.boss ? crackPaths(Math.round(W / 2), Math.round(mid), W, H, o.trainer.portrait) : []
  const bolts = [140, 700, 1150, 1500]
  let slammed = false

  wrap.append(
    bar('sp-kicker', o.boss ? 'THE FINAL FLOOR' : 'TRAINER CHALLENGE'),
    plate('sp-rival', o.trainer.name, o.trainer.title),
    plate('sp-me', o.player, `REMY #${o.lead}`),
    bar('sp-footer', o.boss ? 'ONLY THE BASED MAKE IT TO THE TOP' : 'ART MEETS ATTITUDE'),
  )

  const band = (rows: (string | CanvasPattern)[], y: number, top: boolean) => {
    const u = top ? y / H : 1 - y / H
    return rows[Math.min(rows.length - 1, Math.floor(u * 1.4 * rows.length))]
  }

  await play(total, (t) => {
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.clearRect(0, 0, W, H)
    const shake = t >= slam + 100 && t < slam + 166 ? (Math.floor((t - slam) / 33) % 2 ? -2 : 2) : 0
    const heavy = o.boss && t >= slam + 100 && t < slam + 300 ? (Math.floor(t / 33) % 2 ? 1 : -1) : 0
    if (shake || heavy) {
      g.fillStyle = INK
      g.fillRect(0, 0, W, H)
      g.translate(shake, heavy)
    }
    const offR = Math.round((1 - easeOut(t / 220)) * W * 1.2)
    const offM = -Math.round((1 - easeOut((t - 60) / 220)) * W * 1.2)
    for (let y = 0; y < H; y++) {
      const x = xs(y)
      const r0 = Math.max(0, x + offR)
      if (r0 < W) {
        g.fillStyle = band(rivalRows, y, true)
        g.fillRect(r0, y, W - r0, 1)
      }
      const m1 = Math.min(W, x + offM)
      if (m1 > 0) {
        g.fillStyle = band(meRows, y, false)
        g.fillRect(0, y, m1, 1)
      }
    }
    // Boss: the rival band strobes red on the beat and lightning forks down to the seam.
    if (o.boss && t > slam && Math.floor((t - slam) / 70) % 4 === 0) {
      g.save()
      g.clip(rivalClip)
      g.fillStyle = checker(g, '#ff1e3c', null)
      g.fillRect(0, 0, W, H)
      g.restore()
    }
    for (const l of lines) {
      const y = l.rival ? Math.floor(l.u * (seamY(W) - 2)) : H - 1 - Math.floor(l.u * (H - seamY(0) - 2))
      const span = W + l.len
      const p = (l.x0 + t * l.speed) % span
      const x = l.rival ? Math.round(W - p) : Math.round(p - l.len)
      const lo = l.rival ? Math.max(xs(y) + offR, x) : Math.max(0, x)
      const hi = l.rival ? Math.min(W, x + l.len) : Math.min(xs(y) + offM, x + l.len)
      if (hi > lo) {
        g.fillStyle = l.rival ? rivalLine : meLine
        g.fillRect(lo, y, hi - lo, 1)
      }
    }
    if (o.boss) {
      for (const b0 of bolts) {
        if (t < b0 || t > b0 + 70 || b0 > total - OUT_MS) continue
        const br = rng(b0)
        let x = Math.floor(W * (0.3 + br() * 0.6))
        let y = 0
        const end = seamY(x)
        g.fillStyle = '#c9a8ff'
        while (y < end) {
          const nx = x + Math.round((br() - 0.5) * 14)
          const ny = y + 6 + Math.floor(br() * 6)
          g.fillStyle = '#b06cff'
          pixLine(g, x + 1, y, nx + 1, ny)
          g.fillStyle = WHITE
          pixLine(g, x, y, nx, ny)
          x = nx
          y = ny
        }
      }
    }
    // Sprites ride in a beat after their band: white silhouette flash, then full colour.
    const sIn = 200
    if (t >= sIn) {
      const k = easeOut((t - sIn) / 140)
      const col = t >= sIn + 190
      g.save()
      g.clip(rivalClip)
      g.drawImage(col ? foe.img : foe.flash, foeX + Math.round((1 - k) * 70), foeY)
      g.restore()
      g.save()
      g.clip(meClip)
      g.drawImage(col ? me.img : me.flash, meX - Math.round((1 - k) * 70), meY)
      g.restore()
    }
    if (t >= 180) {
      for (let y = 0; y < H; y++) {
        const x = xs(y)
        if (x < -3 || x > W + 3) continue
        g.fillStyle = INK
        g.fillRect(x - 3, y, 7, 1)
        g.fillStyle = t < 260 || (o.boss && Math.floor(t / 70) % 3 === 0) ? '#fff6d0' : WHITE
        g.fillRect(x - 1, y, 3, 1)
      }
    }
    if (o.boss && t >= slam + 100) drawCracks(g, cracks, clamp01((t - slam - 100) / 120))
    if (t >= slam) {
      if (!slammed) {
        slammed = true
        audio.sfx('throw')
      }
      const k = t < slam + 50 ? 3 : t < slam + 100 ? 2 : 1
      const img = t < slam + 133 ? vsFlash : vs
      g.drawImage(img, Math.round(W / 2 - (img.width * k) / 2), Math.round(mid - (img.height * k) / 2), img.width * k, img.height * k)
    }
    if (t >= slam + 100 && t < slam + 133) {
      g.fillStyle = checker(g, WHITE, null)
      g.fillRect(0, 0, W, H)
    }
    if (t >= total - OUT_MS) wrap.classList.add('out')
    g.setTransform(1, 0, 0, 1, 0, 0)
    blinds(g, W, H, (t - (total - OUT_MS)) / OUT_MS)
  })
  wrap.remove()
}

// ─── Cabald ──────────────────────────────────────────────────────────────────────────────────────────────────────

const SEAL_PATHS = [
  'M10 2h20v4h6v7h-6V9H12v4H8v14h4v4h18v-4h6v7h-6v4H10v-4H4V6h6z',
  'M18 11h6v2h3v3h2v8h-3v5H16v-5h-3v-8h2v-3h3z',
]
const SEAL_HEART = 'M30 18h3v2h2v-2h3v5h-2v2h-2v2h-2v-2h-2z'

/**
 * The Cabald seal as a pixel badge: shaded disc with a stepped rim, the bald-head C glyph and its pink heart. Its
 * paths are axis-aligned on integer coordinates, so filling them on an unscaled canvas lands on exact pixels.
 */
function sealBadge(boss: boolean): HTMLCanvasElement {
  const S = 48
  const p = new Px(S, S)
  const rim = hex(boss ? '#c41830' : '#ff5fa2')
  const face = hex(boss ? '#2a0a14' : '#3b1170')
  p.ellipse(S / 2, S / 2, 22, 22, (x, y, nx, ny) => {
    const d = nx * nx + ny * ny
    if (d > 0.8) return (nx - ny > 0.6 ? shade(rim, -0.35) : rim)
    const light = -nx - ny
    const base = light > 0.7 ? shade(face, 0.18) : light < -0.8 ? shade(face, -0.4) : face
    // Ordered dither between the three face tones instead of a gradient.
    if (light > 0.45 && light <= 0.7 && (x + y) % 2 === 0) return shade(face, 0.18)
    if (light < -0.55 && light >= -0.8 && (x + y) % 2 === 0) return shade(face, -0.4)
    return base
  })
  p.outline(OUT)
  const c = p.toCanvas()
  const x = ctx2d(c)
  x.translate(4, 4)
  x.fillStyle = boss ? '#ff4a5a' : '#ffd6e6'
  for (const d of SEAL_PATHS) x.fill(new Path2D(d))
  x.fillStyle = '#ff9fb9'
  x.fill(new Path2D(SEAL_HEART))
  x.setTransform(1, 0, 0, 1, 0, 0)
  // Hard specular stair on the glyph's upper-left.
  x.fillStyle = WHITE
  x.fillRect(14, 10, 4, 1)
  x.fillRect(12, 11, 2, 1)
  x.fillRect(12, 12, 1, 3)
  return c
}

/** Propaganda stripe tile (period 24): three 45° bands that tile seamlessly both ways. */
function stripeTile(g: G, cols: string[]): CanvasPattern {
  const c = canvas(24, 24)
  const x = ctx2d(c)
  for (let y = 0; y < 24; y++)
    for (let i = 0; i < 24; i++) {
      x.fillStyle = cols[Math.floor(((i + y) % 24) / 8)]
      x.fillRect(i, y, 1, 1)
    }
  return g.createPattern(c, 'repeat') as CanvasPattern
}

function scanlines(g: G): CanvasPattern {
  const c = canvas(1, 2)
  const x = ctx2d(c)
  x.fillStyle = 'rgba(10,0,20,0.2)'
  x.fillRect(0, 1, 1, 1)
  return g.createPattern(c, 'repeat') as CanvasPattern
}

/** Propaganda poster: scrolling pink/purple/black stripes, the seal badge, the trainer, and the denial itself. */
export async function cabaldSplash(root: HTMLElement, o: { trainer: SplashTrainer; boss: boolean }): Promise<void> {
  const foe = await spritePair(o.trainer.portrait)
  const { wrap, g, W, H } = stage(root, `sp-cabald${o.boss ? ' boss' : ''}`)
  const total = o.boss ? 2700 : 2200
  const badge = sealBadge(o.boss)
  const bs = badge.width * 2
  const badgeFlash = silhouette(badge)
  const stripes = stripeTile(
    g,
    o.boss ? ['#8a0f24', '#2a0610', '#07040c'] : ['#ff5fa2', '#5a1f9e', '#160a24'],
  )
  const scan = scanlines(g)
  const slabH = 58
  const avail = H - 26
  const topY = 12 + Math.max(0, Math.floor((avail - (SPRITE_H + slabH)) / 2))
  const slabY = Math.min(H - 14 - slabH, topY + SPRITE_H + 2)
  const sealX = Math.floor(W / 2) - bs - 6
  const sealY = topY + Math.max(0, Math.floor((slabY - topY - bs) / 2))
  const foeX = Math.floor(W / 2) + 10
  const foeY = topY + 2
  const slam = o.boss ? 820 : 640
  const typeAt = slam + 260
  const cracks = o.boss ? crackPaths(Math.floor(W / 2), slabY + 24, W, H, 99) : []
  const accent = o.boss ? '#ff4a5a' : '#ff5fa2'

  const slab = el('div', 'sp-slab')
  slab.style.top = `${slabY}rem`
  slab.style.height = `${slabH}rem`
  slab.style.setProperty('--sp-slam', `${slam}ms`)
  const pre = el('div', 'sp-pre', 'THERE IS NO')
  const big = el('div', 'sp-big', 'CABALD')
  const love = el('div', 'sp-love')
  const typed = el('span')
  love.append(typed)
  slab.append(pre, big, love)
  const pl = plate('sp-cplate', o.trainer.name, o.trainer.title)
  pl.style.top = `${topY + 4}rem`
  wrap.append(
    bar('sp-kicker', o.boss ? 'THE FINAL DENIAL' : 'AN UNOFFICIAL VISIT'),
    pl,
    slab,
    bar('sp-footer', o.boss ? 'YOUR LIQUIDITY IS IN LOVING HANDS' : 'PLEASE DISREGARD THE UNIFORM'),
  )
  const line = 'I love you.'
  let slammed = false
  let hearted = false

  await play(total, (t) => {
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.clearRect(0, 0, W, H)
    const shake = t >= slam && t < slam + (o.boss ? 200 : 66) ? (Math.floor((t - slam) / 33) % 2 ? -2 : 2) : 0
    if (shake) {
      g.fillStyle = INK
      g.fillRect(0, 0, W, H)
      g.translate(shake, o.boss ? -shake / 2 : 0)
    }
    // Diagonal wipe-in, then the stripes crawl like a looping propaganda reel.
    const reveal = easeOut(t / 260) * (W + H)
    const off = Math.floor(t * 0.03) % 24
    g.save()
    g.translate(-off, 0)
    g.fillStyle = stripes
    for (let y = 0; y < H; y++) {
      const w = Math.min(W, Math.floor(reveal - y))
      if (w > 0) g.fillRect(off, y, w, 1)
    }
    g.restore()
    if (reveal >= W + H - 1) {
      // Poster frame: ink border with an accent inner rule.
      g.fillStyle = INK
      g.fillRect(0, 12, 3, H - 26)
      g.fillRect(W - 3, 12, 3, H - 26)
      g.fillStyle = accent
      g.fillRect(3, 12, 1, H - 26)
      g.fillRect(W - 4, 12, 1, H - 26)
    }
    if (t >= 160) {
      // Pop in as a white silhouette at 3× then 2× (integer scales only), then take colour.
      const k = t < 210 ? 3 : 2
      const b = t < 300 ? badgeFlash : badge
      const w = badge.width * k
      g.drawImage(b, Math.round(sealX + bs / 2 - w / 2), Math.round(sealY + bs / 2 - w / 2), w, w)
    }
    if (t >= 300) {
      const k = easeOut((t - 300) / 160)
      g.drawImage(t < 520 ? foe.flash : foe.img, foeX + Math.round((1 - k) * 90), foeY)
    }
    if (o.boss && t >= slam) {
      drawCracks(g, cracks, clamp01((t - slam) / 140))
      if (Math.floor((t - slam) / 60) % 5 === 0) {
        g.fillStyle = checker(g, '#ff1e3c', null)
        g.fillRect(0, 0, W, H)
      }
    }
    g.fillStyle = scan
    g.fillRect(0, 0, W, H)
    if (t >= slam && !slammed) {
      slammed = true
      audio.sfx('throw')
    }
    if (t >= typeAt) {
      const n = Math.min(line.length, Math.floor((t - typeAt) / 55))
      if (typed.textContent?.length !== n) typed.textContent = line.slice(0, n)
      if (n === line.length && !hearted) {
        hearted = true
        love.append(heart(accent))
      }
    }
    if (t >= total - OUT_MS) wrap.classList.add('out')
    g.setTransform(1, 0, 0, 1, 0, 0)
    blinds(g, W, H, (t - (total - OUT_MS)) / OUT_MS)
  })
  wrap.remove()
}

/** The last Cabald foe fainted: the seal cracks down the middle and shatters into falling shards. */
export async function denialBreaks(root: HTMLElement): Promise<void> {
  const { wrap, g, W, H } = stage(root, 'sp-denial')
  const total = 1400
  const badge = scaled(sealBadge(false), 2)
  const bs = badge.width
  const bx = Math.floor(W / 2 - bs / 2)
  const by = Math.max(4, Math.floor(H / 2 - bs / 2 - 20))
  const dim = checker(g, 'rgba(8,2,16,0.85)', 'rgba(8,2,16,0.55)')
  // Zig-zag fault down the seal's middle, in badge-local pixels.
  const r = rng(42)
  const fault: [number, number][] = []
  for (let y = -4; y <= bs + 4; y += 8) fault.push([Math.round(bs / 2 + (r() - 0.5) * 16), y])
  const faultX = (y: number) => {
    const i = Math.max(0, Math.min(fault.length - 2, Math.floor((y + 4) / 8)))
    const [ax, ay] = fault[i]
    const [bx2, by2] = fault[i + 1]
    return Math.round(ax + ((bx2 - ax) * (y - ay)) / (by2 - ay))
  }
  const cell = 12
  const shards: { sx: number; sy: number; vx: number; vy: number; left: boolean }[] = []
  for (let sy = 0; sy < bs; sy += cell)
    for (let sx = 0; sx < bs; sx += cell) {
      const left = sx + cell / 2 < faultX(sy + cell / 2)
      shards.push({ sx, sy, left, vx: (left ? -1 : 1) * (0.02 + r() * 0.06), vy: -0.05 - r() * 0.12 })
    }
  // Split each cell along the fault so the halves separate on a jagged edge rather than on the grid.
  const halves = [true, false].map((left) => {
    const c = canvas(bs, bs)
    const x = ctx2d(c)
    for (let y = 0; y < bs; y++) {
      const f = faultX(y)
      if (left) x.drawImage(badge, 0, y, f, 1, 0, y, f, 1)
      else x.drawImage(badge, f + 1, y, bs - f - 1, 1, f + 1, y, bs - f - 1, 1)
    }
    return c
  })
  const lie = el('div', 'sp-lie', 'There is no Cabald.')
  const love = el('div', 'sp-dlove', 'I love you.')
  love.append(heart('#ff5fa2'))
  const top = by + bs + 8
  lie.style.top = `${top}rem`
  love.style.top = `${top + 14}rem`
  wrap.append(lie, love)
  const breakAt = 320
  const G_ = 0.0006

  await play(total, (t) => {
    g.clearRect(0, 0, W, H)
    g.fillStyle = dim
    g.fillRect(0, 0, W, Math.min(H, Math.ceil((t / 120) * H)))
    if (t < breakAt) {
      const jitter = t > 160 && Math.floor(t / 33) % 2 ? 1 : 0
      g.drawImage(badge, bx + jitter, by)
      const n = Math.ceil(clamp01(t / 260) * (fault.length - 1))
      for (let i = 0; i < n; i++) {
        g.fillStyle = INK
        pixLine(g, bx + jitter + fault[i][0] + 1, by + fault[i][1], bx + jitter + fault[i + 1][0] + 1, by + fault[i + 1][1])
        g.fillStyle = WHITE
        pixLine(g, bx + jitter + fault[i][0], by + fault[i][1], bx + jitter + fault[i + 1][0], by + fault[i + 1][1])
      }
    } else {
      const dt = t - breakAt
      for (const s of shards) {
        const x = Math.round(bx + s.sx + s.vx * dt)
        const y = Math.round(by + s.sy + s.vy * dt + G_ * dt * dt * (1 + (s.sy / bs) * 0.5))
        if (y > H) continue
        g.drawImage(halves[s.left ? 0 : 1], s.sx, s.sy, cell, cell, x, y, cell, cell)
        g.drawImage(halves[s.left ? 1 : 0], s.sx, s.sy, cell, cell, x + (s.left ? 2 : -2), y, cell, cell)
      }
      if (dt < 50) {
        g.fillStyle = checker(g, WHITE, null)
        g.fillRect(0, 0, W, H)
      }
    }
    // The denial glitches on and off while the seal breaks, then the love lingers.
    const flicker = t >= breakAt && (t > 820 || hash(Math.floor(t / 40), 3, 9) % 3 !== 0)
    lie.style.visibility = flicker ? 'visible' : 'hidden'
    lie.style.transform = t < 820 && hash(Math.floor(t / 40), 5, 1) % 4 === 0 ? 'translateX(2rem)' : ''
    love.style.visibility = t >= 760 ? 'visible' : 'hidden'
    if (t >= total - OUT_MS) wrap.classList.add('out')
    blinds(g, W, H, (t - (total - OUT_MS)) / OUT_MS)
  })
  wrap.remove()
}

// ─── Mint certificate ─────────────────────────────────────────────────────────────────────────────────────────────

const GOLD = ['#5a3208', '#9a5a10', '#d89a1c', '#ffd24a', '#fff2a8'].map((c) => hex(c))
/** 4×4 Bayer matrix for ordered dithering between two colours. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

interface CardLayout {
  cw: number
  ch: number
  panel: { x: number; y: number; w: number; h: number }
  info: { x: number; y: number; w: number }
  wide: boolean
}

function certLayout(W: number, H: number): CardLayout {
  const pw = SPRITE_W + 8
  const wide = W >= H
  if (wide) {
    const cw = Math.min(W - 8, 288)
    const ch = Math.min(H - 30, 150)
    const ph = Math.min(SPRITE_H + 6, ch - 16)
    const panel = { x: 8, y: Math.floor((ch - ph) / 2), w: pw, h: ph }
    return { cw, ch, panel, info: { x: panel.x + pw + 8, y: 9, w: cw - pw - 26 }, wide }
  }
  const cw = Math.min(W - 8, 240)
  const ph = SPRITE_H + 6
  const panel = { x: Math.floor((cw - pw) / 2), y: 18, w: pw, h: ph }
  const ch = Math.min(H - 30, panel.y + ph + 96)
  return { cw, ch, panel, info: { x: 10, y: panel.y + ph + 6, w: cw - 20 }, wide }
}

/** Static card art: stepped-corner foil frame, speckled parchment, dithered palette backdrop behind the sprite. */
function cardBase(L: CardLayout, remy: Remy, label: string): { base: HTMLCanvasElement; foil: HTMLCanvasElement } {
  const { cw, ch, panel } = L
  const pal = art.get(remy.idx).palette
  const foilCols = remy.gold ? GOLD : BASE.slice(0, 5)
  const paper = remy.gold ? hex('#fbefc8') : hex('#f4ecd6')
  const p = new Px(cw, ch)
  const foil = new Px(cw, ch)
  // Stepped corners: 3-2-1 pixel notch on every corner.
  const notch = (x: number, y: number) => {
    const dx = Math.min(x, cw - 1 - x)
    const dy = Math.min(y, ch - 1 - y)
    return dx + dy < 3
  }
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      if (notch(x, y)) continue
      const e = Math.min(x, y, cw - 1 - x, ch - 1 - y)
      let c: Col
      if (e === 0) c = OUT
      else if (e <= 3) {
        // Bevelled foil: light on the top/left, shadow on the bottom/right.
        const tl = x < cw - 1 - x && y < ch - 1 - y ? Math.min(x, y) === e : false
        c = e === 2 ? foilCols[2] : tl ? foilCols[4] : e === 1 ? foilCols[1] : foilCols[3]
        foil.set(x, y, 0xffffffff)
      } else if (e === 4) c = shade(paper, -0.35)
      else {
        const h = hash(x, y, 7) % 97
        const edge = e < 9 && (x + y) % 2 === 0 ? shade(paper, -0.1) : paper
        c = h === 0 ? shade(paper, -0.18) : h === 1 ? shade(paper, 0.4) : edge
      }
      p.set(x, y, c)
    }
  // Sprite panel: bg→accent ordered dither, ink frame, 1px inner highlight.
  const bg = hex(pal.bg)
  const ac = hex(pal.accent)
  for (let y = 0; y < panel.h; y++)
    for (let x = 0; x < panel.w; x++) {
      const gx = panel.x + x
      const gy = panel.y + y
      if (x === 0 || y === 0 || x === panel.w - 1 || y === panel.h - 1) {
        p.set(gx, gy, OUT)
        continue
      }
      if (x === 1 || y === 1) {
        p.set(gx, gy, shade(bg, 0.45))
        continue
      }
      const u = y / panel.h
      const th = BAYER[(gy % 4) * 4 + (gx % 4)] / 16
      p.set(gx, gy, u * 0.9 > th ? shade(ac, -0.1) : shade(bg, 0.08))
    }
  const fy = panel.y + panel.h - 7
  p.ellipse(panel.x + panel.w / 2, fy, 22, 3, shade(mix(bg, ac, 0.8), -0.45))
  // Fine print in the 3×5 font.
  const ink = hex('#3a2a4a')
  const muted = shade(paper, -0.45)
  pxText(p, label, L.info.x, L.info.y, remy.gold ? GOLD[1] : BASE[2])
  const fine = 'BASED REMY BOYS  QUEST COLLECTION'
  if (textWidth(fine) <= cw - 16) pxText(p, fine, Math.floor((cw - textWidth(fine)) / 2), ch - 11, muted)
  // Separator rule under the heading row.
  for (let x = 0; x < L.info.w; x++) p.set(L.info.x + x, L.info.y + 9, x % 2 ? muted : ink)
  // Palette swatches.
  const sw = [pal.bg, pal.skin, pal.hair, pal.shirt, pal.accent]
  const sy = L.info.y + 58
  sw.forEach((c, i) => {
    const x = L.info.x + i * 13
    p.rect(x, sy, 11, 11, OUT)
    p.rect(x + 1, sy + 1, 9, 9, hex(c))
    p.hl(x + 1, sy + 1, 9, shade(hex(c), 0.35))
    p.vl(x + 9, sy + 2, 8, shade(hex(c), -0.3))
  })
  return { base: p.toCanvas(), foil: foil.toCanvas() }
}

function mintStamp(): HTMLCanvasElement {
  const s = 2
  const w = textWidth('MINTED', s) + 12
  const h = 5 * s + 12
  const p = new Px(w, h)
  const red = hex('#d8263c')
  p.rect(0, 0, w, h, red)
  p.each((x, y) => (x >= 3 && y >= 3 && x < w - 3 && y < h - 3 ? hex('#fff4e8') : 0))
  pxText(p, 'MINTED', 6, 6, red, s)
  // Knock out a few ink-starved pixels so it reads as a rubber stamp.
  p.each((x, y, c) => (c === red && hash(x, y, 3) % 11 === 0 ? hex('#ff8a9a') : 0))
  p.outline(OUT)
  return p.toCanvas()
}

/**
 * Catch keepsake card. Waits for A or a tap on the overlay, then fades out. The gold variant runs a stepped
 * diagonal shimmer across its foil and sprite panel.
 */
export async function mintCertificate(root: HTMLElement, o: { remy: Remy; edition: number; place: string }): Promise<void> {
  const { remy } = o
  const feature = art.get(remy.idx)
  const sprite = await art.sprite(remy.idx)
  const flash = silhouette(sprite)
  const { wrap, g, W, H } = stage(root, `sp-mint${remy.gold ? ' gold' : ''}`)
  const L = certLayout(W, H)
  const { base, foil } = cardBase(L, remy, remy.gold ? 'GOLD EDITION' : 'ORIGINAL ART')
  const cardX = Math.floor((W - L.cw) / 2)
  const cardY = 14 + Math.max(0, Math.floor((H - 28 - L.ch) / 2))
  const card = el('div', 'sp-card')
  card.style.left = `${cardX}rem`
  card.style.top = `${cardY}rem`
  card.style.width = `${L.cw}rem`
  card.style.height = `${L.ch}rem`
  const cc = canvas(L.cw, L.ch)
  cc.style.width = `${L.cw}rem`
  cc.style.height = `${L.ch}rem`
  const cg = ctx2d(cc)
  const shine = canvas(L.cw, L.ch)
  const sg = ctx2d(shine)
  const at = (e: HTMLElement, x: number, y: number, w?: number) => {
    e.style.left = `${x}rem`
    e.style.top = `${y}rem`
    if (w) e.style.width = `${w}rem`
    return e
  }
  const { info } = L
  const ed = at(el('b', 'sp-ed'), info.x, info.y - 1, info.w)
  ed.textContent = `#${String(o.edition).padStart(4, '0')}`
  const name = at(el('h2', 'sp-name'), info.x, info.y + 14, info.w)
  name.textContent = remyName(remy)
  const epi = at(el('div', 'sp-epi'), info.x, info.y + 26, info.w)
  epi.textContent = feature.epithet
  const type = species(remy.idx).type
  const chip = at(el('span', 'sp-chip'), info.x, info.y + 44)
  chip.textContent = type
  chip.style.background = TYPE_COLOR[type]
  const lv = at(el('b', 'sp-lv'), info.x + type.length * 8 + 14, info.y + 45)
  lv.textContent = `LV${remy.level}`
  const place = at(el('div', 'sp-place'), info.x + 66, info.y + 58, Math.max(40, info.w - 66))
  place.textContent = `Minted at ${o.place}`
  const stampEl = mintStamp()
  stampEl.className = 'sp-stamp'
  stampEl.style.width = `${stampEl.width}rem`
  stampEl.style.height = `${stampEl.height}rem`
  at(stampEl, L.cw - stampEl.width - 8, L.wide ? L.ch - stampEl.height - 16 : L.panel.y + L.panel.h - stampEl.height + 4)
  card.append(cc, ed, name, epi, chip, lv, place, stampEl)
  const head = el('div', 'sp-mhead', 'MINT CERTIFICATE')
  head.style.top = `${Math.max(2, cardY - 12)}rem`
  const hint = el('div', 'sp-hint', 'TAP / A TO COLLECT')
  hint.style.top = `${Math.min(H - 10, cardY + L.ch + 3)}rem`
  wrap.append(head, card, hint)
  const dim = checker(g, 'rgba(10,6,24,0.9)', 'rgba(10,6,24,0.7)')
  const px = L.panel.x + Math.floor((L.panel.w - SPRITE_W) / 2)
  const py = L.panel.y + L.panel.h - 3 - SPRITE_H
  const stars = Array.from({ length: 18 }, (_, i) => [hash(i, 1, 5) % W, hash(i, 2, 5) % H, hash(i, 3, 5) % 900])
  const readyAt = 900
  let ready = false
  let finish: (() => void) | null = null
  const collected = new Promise<void>((res) => {
    finish = res
  })

  const draw = (t: number) => {
    g.clearRect(0, 0, W, H)
    g.fillStyle = dim
    g.fillRect(0, 0, W, H)
    for (const [x, y, ph] of stars) {
      const k = Math.floor((t + ph) / 150) % 6
      if (k > 2) continue
      g.fillStyle = remy.gold ? '#ffd24a' : '#8cb4ff'
      g.fillRect(x, y, 1, 1)
      if (k === 1) {
        g.fillRect(x - 1, y, 3, 1)
        g.fillRect(x, y - 1, 1, 3)
      }
    }
    cg.clearRect(0, 0, L.cw, L.ch)
    cg.drawImage(base, 0, 0)
    cg.save()
    cg.beginPath()
    cg.rect(L.panel.x + 2, L.panel.y + 2, L.panel.w - 3, L.panel.h - 3)
    cg.clip()
    cg.drawImage(t < 520 ? flash : sprite, px, py)
    cg.restore()
    if (remy.gold) {
      // 45° shimmer band stepping across the foil frame and sprite panel every ~1.6s.
      const pos = Math.floor(((t % 1600) / 1600) * (L.cw + L.ch + 40)) - 20
      sg.globalCompositeOperation = 'source-over'
      sg.clearRect(0, 0, L.cw, L.ch)
      for (let y = 0; y < L.ch; y++) {
        const x = pos - y
        sg.fillStyle = 'rgba(255,250,210,0.9)'
        sg.fillRect(x, y, 3, 1)
        sg.fillStyle = 'rgba(255,250,210,0.45)'
        sg.fillRect(x + 5, y, 1, 1)
      }
      sg.globalCompositeOperation = 'destination-in'
      sg.drawImage(foil, 0, 0)
      sg.fillStyle = WHITE
      sg.fillRect(L.panel.x + 2, L.panel.y + 2, 1, 1)
      cg.drawImage(shine, 0, 0)
    }
  }

  wrap.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (ready) finish?.()
  })
  const pop = input.push((b) => {
    if (b === 'a' && ready) finish?.()
  })
  let live = true
  const loop = () => {
    if (!live) return
    draw(performance.now() - t0)
    requestAnimationFrame(loop)
  }
  const t0 = performance.now()
  requestAnimationFrame(loop)
  await sleep(readyAt)
  ready = true
  wrap.classList.add('ready')
  audio.sfx('select')
  await collected
  pop()
  const t1 = performance.now()
  wrap.classList.add('out')
  await play(OUT_MS, (t) => {
    live = false
    draw(t1 - t0 + t)
    blinds(g, W, H, t / OUT_MS)
    card.style.visibility = t > OUT_MS / 2 ? 'hidden' : ''
  })
  wrap.remove()
}
