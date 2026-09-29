/**
 * The painted stages behind the story scenes: loading card, title, Prof's intro room, the starter lab, the Hall of
 * Fame and the credits. Each stage bakes its scenery once per screen size (see scenekit) and animates sprites,
 * light and particles on top; scenes.ts drives the story beats through the small controllers returned here.
 */
import { SPRITE_FEET, art } from './art'
import { REMY_COUNT, civRemy } from './data'
import { Px, canvas, hex, text as tinyText, textWidth } from './gfx/px'
import { drawRemyActor } from './gfx/remyactor'
import {
  GOLD_FACE,
  type Logo,
  type Particle,
  type Stage,
  bands,
  bayer,
  drawLogo,
  drawMaterialize,
  drawShadow,
  drawSprite,
  drawStars,
  drawText,
  ease,
  fontReady,
  glyphs,
  iris,
  ihash,
  lettering,
  loadSprite,
  logo,
  particles,
  reducedMotion,
  shadeHex,
  sparkleBurst,
  spawn,
  stage,
  starfield,
  tileX,
} from './scenekit'
import { PAL } from './skin'
import { sleep, uiRoot } from './ui'

/**
 * Places `choose(…, {cls:'menu-title'})` (the menu lives outside the scene element): a `w`-wide menu centred on the
 * stage on whole pixels, top edge at `y`.
 */
function placeMenu(W: number, y: number, w: number) {
  uiRoot.style.setProperty('--sc-mx', `${Math.floor((W - w) / 2)}rem`)
  uiRoot.style.setProperty('--sc-my', `${y}rem`)
  uiRoot.style.setProperty('--sc-mw', `${w}rem`)
}

const DAWN = ['#07061c', '#0d0b2e', '#171448', '#241a62', '#3a2376', '#5c2c86', '#8e3b8c', '#c7568a', '#f0806f']
const NIGHT = ['#050414', '#0a0a26', '#10103a', '#17164c', '#1f1c5e']

// ───────────── Scenery painters ─────────────

/** The Base mark as a rising sun: lit Base-blue disc with the logo's bar notch, ringed by a dithered halo. */
function sunArt(r: number): HTMLCanvasElement {
  const G = 7
  const size = (r + G) * 2
  const c = r + G
  const p = new Px(size, size)
  const halo = hex('#8fb0ff', 60)
  p.ellipse(c, c, r + G, r + G, (x, y) => ((x + y) % 2 === 0 && (x % 4 === 0 || y % 4 === 0) ? halo : 0))
  p.ellipse(c, c, r + 3, r + 3, (x, y) => ((x + y) % 2 === 0 ? hex('#a9c6ff', 90) : 0))
  const ramp = ['#1c2a78', '#0038c8', '#0052ff', '#4d8bff', '#bcd3ff'].map((h) => hex(h))
  p.ellipse(c, c, r, r, (x, y, nx, ny) => {
    const l = -nx * 0.6 - ny * 0.8 + (bayer(x, y) - 0.5) * 0.35
    const i = l > 0.72 ? 4 : l > 0.3 ? 3 : l > -0.35 ? 2 : l > -0.7 ? 1 : 0
    return nx * nx + ny * ny > 0.86 && l > 0.2 ? ramp[4] : ramp[i]
  })
  const bar = Math.max(3, Math.round(r * 0.22))
  for (let y = c - (bar >> 1); y < c - (bar >> 1) + bar; y++)
    for (let x = 0; x < c + Math.round(r * 0.12); x++) p.put(x, y, 0)
  return p.toCanvas()
}

/** Eight baked frames of dithered god-rays fanning from (cx, cy); cycling them turns the fan a notch at a time. */
function rayFrames(w: number, h: number, cx: number, cy: number): HTMLCanvasElement[] {
  const col = hex('#c9d9ff', 44)
  const reach = Math.hypot(Math.max(cx, w - cx), cy)
  return Array.from({ length: 8 }, (_, f) => {
    const p = new Px(w, h)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const a = Math.atan2(y - cy, x - cx) / (Math.PI * 2)
        const v = (((a * 14 + f / 8) % 1) + 1) % 1
        if (v > 0.4) continue
        const fade = 1 - Math.hypot(x - cx, y - cy) / reach
        if (fade * 0.7 > bayer(x, y)) p.put(x, y, col)
      }
    return p.toCanvas()
  })
}

/** Dawn clouds lit from below, 256px tiling strip. */
function cloudStrip(): HTMLCanvasElement {
  const w = 256
  const h = 30
  const mask = new Px(w, h)
  const one = hex('#ffffff')
  for (const [cx, cy, n] of [
    [40, 16, 5],
    [150, 10, 4],
    [214, 20, 3],
  ])
    for (let i = 0; i < n; i++) {
      const px = cx + i * 9 - n * 4
      const rx = 8 + ihash(6, cx, i)
      const ry = 4 + ihash(3, i, cy)
      for (const dx of [-w, 0, w]) mask.ellipse(px + dx, cy - (i % 2) * 2, rx, ry, one)
    }
  const p = new Px(w, h)
  const body = hex('#3b2a78')
  const lit = hex('#c8608e')
  const glow = hex('#f39a82')
  const top = hex('#4d3a8e')
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!mask.get(x, y)) continue
      const below = !mask.get(x, y + 1)
      const below2 = !mask.get(x, y + 2)
      const above = !mask.get(x, y - 1)
      p.put(x, y, below ? glow : below2 ? lit : !mask.get(x, y + 3) && bayer(x, y) < 0.5 ? lit : above ? top : body)
    }
  return p.toCanvas()
}

/** Liquidity City on the horizon: tiling silhouette with lit windows and blinking-red antenna tips. */
function skylineStrip(): HTMLCanvasElement {
  const w = 240
  const h = 44
  const p = new Px(w, h)
  const body = hex('#1c1648')
  const rim = hex('#3e2f80')
  const winOn = hex('#ffcf6a')
  const winBlue = hex('#6fa0ff')
  const winOff = hex('#2c2360')
  let x = 0
  let i = 0
  while (x < w) {
    const bw = Math.min(w - x, 7 + ihash(14, i, 3))
    const bh = 10 + ihash(30, i, 5)
    const top = h - bh
    p.rect(x, top, bw, bh, body)
    p.hl(x, top, bw, rim)
    p.vl(x, top, bh, rim)
    for (let wy = top + 3; wy < h - 2; wy += 3)
      for (let wx = x + 2; wx < x + bw - 1; wx += 3) {
        const r = ihash(100, wx, wy, 11)
        p.put(wx, wy, r < 12 ? winOn : r < 17 ? winBlue : r < 40 ? winOff : body)
      }
    if (ihash(4, i, 7) === 0 && bw > 8) {
      p.vl(x + (bw >> 1), top - 5, 5, rim)
      p.put(x + (bw >> 1), top - 6, hex('#ff5a6a'))
    }
    x += bw + ihash(3, i, 9)
    i++
  }
  return p.toCanvas()
}

/** Rolling hills with a sunlit crest, 192px tiling strip. */
function hillStrip(): HTMLCanvasElement {
  const w = 192
  const h = 34
  const p = new Px(w, h)
  const crest = hex('#5a7fb8')
  const lit = hex('#2f4f86')
  const body = hex('#1a2c5c')
  const deep = hex('#122046')
  for (let x = 0; x < w; x++) {
    const a = (x / w) * Math.PI * 2
    const top = Math.round(12 + 5 * Math.sin(a) + 3 * Math.sin(a * 3 + 1) + 1.5 * Math.sin(a * 5 + 2))
    for (let y = top; y < h; y++) {
      const d = y - top
      p.put(x, y, d === 0 ? crest : d < 3 || (d < 6 && bayer(x, y) < 0.5) ? lit : d > 14 && bayer(x, y) < 0.5 ? deep : body)
    }
  }
  return p.toCanvas()
}

/** Foreground meadow the title lineup stands in (static; the world behind it scrolls). */
function meadow(w: number, h: number): HTMLCanvasElement {
  const p = new Px(w, h)
  const tip = hex('#9be07a')
  const grass = hex('#44a255')
  const mid = hex('#2c7447')
  const dark = hex('#1d4f3c')
  const deep = hex('#143a30')
  for (let x = 0; x < w; x++) {
    const a = (x / w) * Math.PI * 2
    const top = 5 + Math.round(1.5 * Math.sin(a * Math.round(w / 44)) + Math.sin(a * Math.round(w / 21) + 1))
    for (let y = top; y < h; y++) {
      const d = y - top
      p.put(x, y, d === 0 ? tip : d < 3 ? grass : d < 6 ? (bayer(x, y) < 0.5 ? grass : mid) : d < 10 ? mid : d < 13 ? (bayer(x, y) < 0.5 ? mid : dark) : d < 17 ? dark : deep)
    }
    const r = ihash(100, x, 21)
    if (r < 18) {
      const bh = 2 + (r % 3)
      p.vl(x, top - bh, bh, r % 2 ? grass : tip)
    } else if (r < 21) {
      const fy = top + 4 + (r % 8)
      p.put(x, fy, hex(r % 2 ? '#ff8fb0' : '#ffd34a'))
      p.put(x, fy - 1, hex('#fff6d0'))
    }
  }
  return p.toCanvas()
}

/** Blue ribbon banner with folded tails carrying 8px caption text. */
function ribbon(caption: string): HTMLCanvasElement {
  const tw = glyphs(caption).w
  const bodyW = tw + 16
  const w = bodyW + 12
  const h = 15
  const p = new Px(w, h)
  const ink = hex(PAL.ink)
  const tail = hex(PAL.navy)
  const fold = hex('#101a5a')
  for (const side of [0, 1]) {
    for (let y = 3; y < 14; y++)
      for (let x = 0; x < 9; x++) {
        const notch = Math.abs(y - 8.5) < 3 - x * 0.9 + 1
        if (notch && x < 3) continue
        p.put(side ? w - 1 - x : x, y, y === 3 || y === 13 || x === 0 || (notch && x === 3) ? ink : tail)
      }
    p.put(side ? w - 7 : 6, 12, fold)
    p.put(side ? w - 7 : 6, 11, fold)
  }
  const bx = 6
  const body = hex(PAL.blue)
  for (let y = 0; y < 12; y++)
    for (let x = 0; x < bodyW; x++) {
      const edge = y === 0 || y === 11 || x === 0 || x === bodyW - 1
      p.put(bx + x, y, edge ? ink : y === 1 ? hex('#8fb4ff') : y === 10 ? hex(PAL.navy) : y === 2 && x % 2 ? hex('#5a86f0') : body)
    }
  const c = p.toCanvas()
  const g = c.getContext('2d') as CanvasRenderingContext2D
  drawText(g, caption, Math.floor(w / 2), 2, '#ffffff', { shadow: PAL.ink }, 'center')
  return c
}

// ───────────── Loading card ─────────────

/** Night sky, the logo and a stepped gold progress bar that reads `progress()` (0–1) every frame. */
export function loadingStage(host: HTMLElement, progress: () => number) {
  let sky: HTMLCanvasElement
  let stars = starfield(1, 1, 0, 1)
  let mark: Logo | null = null
  let shown = 0
  void fontReady().then(() => {
    mark = logo(3, 2)
  })
  stage(
    host,
    (s) => {
      const { g, W, H, t } = s
      g.drawImage(sky, 0, 0)
      drawStars(g, stars, t)
      const top = Math.round(H / 2) - 52
      if (mark) {
        drawLogo(g, mark, Math.floor((W - mark.img.width) / 2), top, ((t % 3000) / 900) % 3.4)
        drawText(g, 'ART IS ALIVE', Math.floor(W / 2), top + mark.img.height + 5, PAL.gold, { outline: PAL.ink }, 'center')
      }
      const segs = 19
      const bw = segs * 6 + 3
      const bx = Math.floor((W - bw) / 2)
      const by = top + 78
      g.fillStyle = PAL.ink
      g.fillRect(bx + 1, by, bw - 2, 12)
      g.fillRect(bx, by + 1, bw, 10)
      g.fillStyle = '#3a4388'
      g.fillRect(bx + 1, by + 1, bw - 2, 10)
      g.fillStyle = '#0d1234'
      g.fillRect(bx + 2, by + 2, bw - 4, 8)
      const target = Math.round(Math.min(1, progress()) * segs)
      shown = Math.min(target, shown + s.dt / 45)
      for (let i = 0; i < Math.floor(shown); i++) {
        const x = bx + 3 + i * 6
        const lead = i === Math.floor(shown) - 1 && shown < segs && Math.floor(t / 120) % 2
        g.fillStyle = lead ? '#ffffff' : PAL.gold
        g.fillRect(x, by + 3, 5, 6)
        g.fillStyle = lead ? '#ffffff' : '#fff3b8'
        g.fillRect(x, by + 3, 5, 1)
        g.fillStyle = lead ? '#fff3b8' : PAL.gold2
        g.fillRect(x, by + 8, 5, 1)
      }
      if (mark) drawText(g, 'LOADING 4,490 ORIGINALS', Math.floor(W / 2), by + 18, '#a9b8ff', { shadow: PAL.ink }, 'center')
    },
    (s) => {
      sky = bands(s.W, s.H, NIGHT).toCanvas()
      stars = starfield(s.W, s.H, Math.round((s.W * s.H) / 700), 17)
    },
  )
}

// ───────────── Title ───────────

export interface TitleStage {
  /** START was pressed: flash, hop, and hide the prompt. */
  press(): void
  /** The menu is up: the lineup steps aside to frame it. */
  menu(open: boolean): void
}

/** Dawn over Liquidity City: parallax skyline and hills, the Base sun, and `lineup` Remys flanking the menu. */
export function titleStage(host: HTMLElement, lineup: number[]): TitleStage {
  const still = reducedMotion()
  const fx: Particle[] = []
  let pressedAt = -1
  let menuAt = -1
  let menuOpen = false
  let nextGlint = 1200
  let nextStar = 3000
  let star = { x: 0, y: 0, t0: -1e9 }
  let L = {
    sky: null as unknown as HTMLCanvasElement,
    rays: [] as HTMLCanvasElement[],
    sun: null as unknown as HTMLCanvasElement,
    clouds: cloudStrip(),
    skyline: skylineStrip(),
    hills: hillStrip(),
    ground: null as unknown as HTMLCanvasElement,
    ribbon: ribbon('A BASE ADVENTURE'),
    mark: logo(5, 3),
    stars: starfield(1, 1, 0, 1),
    yH: 0,
    sunX: 0,
    sunY: 0,
    logoX: 0,
    logoY: 0,
    subY: 0,
    pressY: 0,
  }
  const layout = (s: Stage) => {
    const { W, H } = s
    // Phones in portrait get a roomier composition; the desktop shell is only slightly taller than wide.
    const tall = H >= W
    // Short landscape screens take the smaller logo so the lineup's heads stay clear of the ribbon.
    const mark = logo(W >= 256 && H >= 210 ? 5 : 4, 3)
    const yH = H - 50
    const r = tall ? 40 : 34
    const sunX = Math.floor(W / 2)
    const sunY = yH - Math.round(r * 0.55)
    const logoY = tall ? 22 : 5
    const subY = logoY + mark.img.height - 1
    const subBottom = subY + L.ribbon.height
    const sunTop = sunY - r
    L = {
      ...L,
      sky: bands(W, yH + 2, DAWN).toCanvas(),
      rays: rayFrames(W, yH, sunX, sunY),
      sun: sunArt(r),
      ground: meadow(W, 24),
      mark,
      stars: starfield(W, yH - 24, Math.round((W * yH) / 600), 5),
      yH,
      sunX,
      sunY,
      logoX: Math.floor((W - mark.img.width) / 2),
      logoY,
      subY,
      pressY: tall ? Math.round((subBottom + sunTop) / 2) - 4 : subBottom + 12,
    }
    placeMenu(W, tall ? Math.max(subBottom + 4, L.pressY - 20) : subBottom + 4, 96)
  }
  const hop = (k: number) => (k > 0 && k < 1 ? Math.round(Math.sin(k * Math.PI) * 7) : 0)
  const footPx = new Px(textWidth('BASED REMY BOYS') + 1, 6)
  tinyText(footPx, 'BASED REMY BOYS', 0, 0, hex('#c4d6ff'), 1, hex(PAL.ink))
  const foot = footPx.toCanvas()
  const st = stage(
    host,
    (s) => {
      const { g, W, H, dt } = s
      const t = s.t
      const drift = still ? 0 : t
      g.drawImage(L.sky, 0, 0)
      g.fillStyle = DAWN[DAWN.length - 1]
      g.fillRect(0, L.yH + 2, W, H - L.yH)
      drawStars(g, L.stars, t)
      if (t - star.t0 < 520) {
        const k = (t - star.t0) / 520
        const x = Math.round(star.x + k * 60)
        const y = Math.round(star.y + k * 24)
        for (let i = 0; i < 6; i++) {
          g.fillStyle = i ? '#8fa8ff' : '#ffffff'
          g.fillRect(x - i * 2, y - i, 2, 1)
        }
      } else if (t > nextStar && !still) {
        nextStar = t + 5000 + Math.random() * 5000
        star = { x: Math.random() * W * 0.7, y: 6 + Math.random() * L.yH * 0.3, t0: t }
      }
      g.drawImage(L.rays[still ? 0 : Math.floor(t / 260) % 8], 0, 0)
      g.drawImage(L.sun, L.sunX - (L.sun.width >> 1), L.sunY - (L.sun.height >> 1))
      tileX(g, L.clouds, drift * 0.004, L.yH - 58, W)
      tileX(g, L.skyline, drift * 0.007, L.yH - L.skyline.height + 4, W)
      tileX(g, L.hills, drift * 0.016, H - 44, W)
      g.drawImage(L.ground, 0, H - L.ground.height)
      // Fireflies over the meadow.
      if (!still && fx.filter((p) => p.kind === 'mote').length < 14)
        spawn(fx, {
          kind: 'mote',
          x: Math.random() * W,
          y: H - 4 - Math.random() * 20,
          vx: (Math.random() - 0.5) * 6,
          vy: -4 - Math.random() * 7,
          max: 2600 + Math.random() * 2400,
          c: Math.random() < 0.6 ? '#ffe98a' : '#b8ffb0',
        })
      // Lineup: outer pair behind, inner pair in front, everyone facing the middle.
      const spread = menuAt < 0 ? 0 : ease((t - menuAt) / 360)
      const k = menuAt < 0 ? 0 : menuOpen ? spread : 1 - spread
      const order = [0, 3, 1, 2]
      for (const i of order) {
        const idx = lineup[i]
        if (idx === undefined) continue
        const left = i < 2
        const outer = i === 0 || i === 3
        // The inner pair frames the prompt/menu between them; wider screens open the gap further.
        const inner = Math.max(50, Math.round(W * 0.24))
        const dx = outer ? inner + 46 + Math.round(k * 22) : inner + Math.round(k * 16)
        const cx = Math.floor(W / 2) + (left ? -dx : dx)
        const feet = H - (outer ? 11 : 6)
        const bob = still ? 0 : Math.floor((t + i * 230) / 440) % 2
        const jump = pressedAt < 0 ? 0 : hop((t - pressedAt - i * 70) / 380)
        drawShadow(g, cx, feet, outer ? 34 : 40)
        drawSprite(g, idx, cx, feet - bob - jump)
      }
      particles(g, fx, dt)
      drawLogo(g, L.mark, L.logoX, L.logoY, still ? -1 : (t % 4600) / 1100)
      if (!still && t > nextGlint && L.mark.glints.length) {
        nextGlint = t + 500 + Math.random() * 900
        const [gx, gy] = L.mark.glints[Math.floor(Math.random() * L.mark.glints.length)]
        spawn(fx, { kind: 'spark', x: L.logoX + gx, y: L.logoY + gy, max: 520, c: '#fff6c8' })
      }
      g.drawImage(L.ribbon, Math.floor((W - L.ribbon.width) / 2), L.subY)
      if (pressedAt < 0 && Math.floor(t / 400) % 3 !== 2)
        drawText(g, 'PRESS START', Math.floor(W / 2), L.pressY, PAL.gold, { outline: PAL.ink }, 'center')
      if (!menuOpen) g.drawImage(foot, Math.floor((W - foot.width) / 2), H - 8)
      const since = t - pressedAt
      if (pressedAt >= 0 && since < 200) {
        g.fillStyle = since < 70 ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)'
        g.fillRect(0, 0, W, H)
      }
    },
    layout,
  )
  return {
    press() {
      pressedAt = st.t
      sparkleBurst(fx, Math.floor(st.W / 2), L.pressY + 4, 14, 70)
    },
    menu(open: boolean) {
      menuOpen = open
      menuAt = st.t
    },
  }
}

// ───────────── Prof's intro room ─────────────

/** Round stage disc: lit Base-blue top, banded side, ink keyline (66×20, top centre at (33, 7)). */
function platformArt(): HTMLCanvasElement {
  const p = new Px(66, 20)
  const side = ['#2f5fe8', '#2644b8', '#1c2a78', '#1c2a78', '#141a46', '#10132e']
  for (let dy = side.length - 1; dy >= 0; dy--) p.ellipse(33, 7 + dy, 31, 5.5, hex(side[dy]))
  const top = ['#e8f0ff', '#a9c6ff', '#78a4ff', '#4d8bff'].map((h) => hex(h))
  p.ellipse(33, 7, 31, 5.5, (x, y, nx, ny) => {
    const d = nx * nx + ny * ny + (bayer(x, y) - 0.5) * 0.14
    return d < 0.2 ? top[0] : d < 0.5 ? top[1] : d < 0.8 ? top[2] : top[3]
  })
  p.outline(hex(PAL.ink))
  return p.toCanvas()
}

/** A dithered, translucent light cone `h` tall, `top`→`bottom` px wide, brighter core down the middle. */
function coneArt(h: number, top: number, bottom: number, col: string): HTMLCanvasElement {
  const w = bottom + 2
  const p = new Px(w, h)
  const c = hex(col, 64)
  const core = hex('#ffffff', 56)
  for (let y = 0; y < h; y++) {
    const k = y / Math.max(1, h - 1)
    const half = (top + (bottom - top) * k) / 2
    const density = 0.14 + 0.4 * k
    for (let x = 0; x < w; x++) {
      const e = Math.abs(x + 0.5 - w / 2) / half
      if (e > 1) continue
      const b = bayer(x, y)
      if (density * (1 - e * e * 0.7) > b) p.put(x, y, e < 0.3 && b < density * 0.5 ? core : c)
    }
  }
  return p.toCanvas()
}

/** Dark gradient void with a vignette and a faint floor sheen at `floor`. */
function roomArt(W: number, H: number, floor: number): HTMLCanvasElement {
  const p = bands(W, H, ['#030309', '#07071c', '#0c0b2a', '#110f36', '#0c0b28', '#060612'])
  const ink = hex('#020206')
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const nx = (x - W / 2) / (W * 0.62)
      const ny = (y - H * 0.45) / (H * 0.72)
      const d = nx * nx + ny * ny
      if (d > 0.42 && (d - 0.42) * 1.8 > bayer(x, y)) p.put(x, y, ink)
    }
  const sheen = hex('#1a2266')
  const faint = hex('#121848')
  p.ellipse(W / 2, floor + 5, W * 0.46, 14, (x, y, nx, ny) =>
    nx * nx + ny * ny < 0.3 ? (bayer(x, y) < 0.5 ? sheen : faint) : bayer(x, y) < 0.3 ? faint : 0,
  )
  return p.toCanvas()
}

export interface IntroStage {
  /** Beams `idx` in beside the Prof, who steps aside; resolves once the Remy has fully formed. */
  summon(idx: number): Promise<void>
  /** The Remy dissolves back into light and the Prof returns to centre stage. */
  dismiss(): Promise<void>
  /** Closes a pixel iris on the Remy (or the Prof when alone). */
  irisOut(): Promise<void>
}

/** Emerald-style intro: the Prof on a lit disc in a dark room; the collection twinkles in the dark behind. */
export function introStage(host: HTMLElement, prof: number): IntroStage {
  const still = reducedMotion()
  const fx: Particle[] = []
  const plat = platformArt()
  let room = plat
  let cone = plat
  let feet = 0
  let dx = 0
  let pair = { from: 0, to: 0, t0: 0 }
  let remy: { idx: number; t0: number; leaving: boolean } | null = null
  let irisT0 = -1
  let crowdT0 = -1
  let crowd: { idx: number; x: number; y: number; period: number }[] = []
  const pairAt = (t: number) => pair.from + (pair.to - pair.from) * ease((t - pair.t0) / 450)
  const drawPlatform = (g: CanvasRenderingContext2D, x: number) => {
    g.drawImage(cone, x - (cone.width >> 1), 0)
    g.drawImage(plat, x - 33, feet - 7)
  }
  const st = stage(
    host,
    (s) => {
      const { g, W, H, t, dt } = s
      g.drawImage(room, 0, 0)
      if (crowdT0 >= 0) {
        const fadeIn = Math.min(1, (t - crowdT0) / 1500)
        const rise = still ? 0 : Math.floor(t / 350)
        const span = Math.max(20, feet - 60)
        for (const c of crowd) {
          const head = art.head(c.idx)
          if (!head) continue
          const ph = ((t + c.period * 7) % c.period) / c.period
          const a = ph < 0.45 ? 0.5 : ph < 0.6 ? 0.25 : ph < 0.85 ? 0 : 0.25
          if (!a) continue
          g.globalAlpha = Math.round(a * fadeIn * 4) / 4
          const y = ((((c.y - rise) % span) + span) % span) + 2
          g.drawImage(head.img, head.sx, head.sy, head.sw, head.sh, c.x, y, 16, 16)
        }
        g.globalAlpha = 1
      }
      const cx = Math.floor(W / 2)
      const profX = cx - Math.round(pairAt(t) * dx)
      const remyX = cx + dx
      drawPlatform(g, profX)
      let p = -1
      if (remy) {
        const e = t - remy.t0
        p = remy.leaving ? 1 - e / 600 : (e - 220) / 900
        const beam = remy.leaving ? Math.max(0, 1 - e / 500) : e < 260 ? e / 260 : e < 1150 ? 1 : Math.max(0, 1 - (e - 1150) / 300)
        const shown = Math.round(beam * (feet + 2))
        if (p > 0 || !remy.leaving) g.drawImage(plat, remyX - 33, feet - 7)
        if (shown > 0) g.drawImage(cone, 0, 0, cone.width, shown, remyX - (cone.width >> 1), 0, cone.width, shown)
        if (!still && p > 0 && p < 1 && Math.random() < 0.5)
          spawn(fx, {
            kind: 'spark',
            x: remyX + (Math.random() - 0.5) * 50,
            y: feet - Math.random() * 100,
            vy: -12,
            max: 380,
            c: '#a9c6ff',
          })
        if (remy.leaving && p <= 0) remy = null
      }
      drawShadow(g, profX, feet, 36)
      drawSprite(g, prof, profX, feet)
      if (remy && p > 0) {
        drawShadow(g, remyX, feet, 36)
        drawMaterialize(g, remy.idx, remyX, feet, p)
      }
      if (!still && fx.filter((f) => f.kind === 'mote').length < 10)
        spawn(fx, {
          kind: 'mote',
          x: profX + (Math.random() - 0.5) * 36,
          y: feet - Math.random() * feet,
          vy: 3 + Math.random() * 4,
          vx: (Math.random() - 0.5) * 3,
          max: 2200,
          c: '#c4d6ff',
        })
      particles(g, fx, dt)
      if (irisT0 >= 0) {
        // Constant-speed close onto the hero's face, a beat on the small circle, then snap shut.
        const e = t - irisT0
        const far = Math.hypot(W, H)
        const r = e < 700 ? far + (18 - far) * (e / 700) : e < 1000 ? 18 : Math.max(0, 18 - (e - 1000) / 8)
        iris(g, W, H, remy ? remyX : profX, feet - 76, Math.floor(r / 2) * 2)
      }
    },
    (s) => {
      feet = Math.max(124, s.H - 80)
      dx = Math.min(58, Math.floor(s.W / 4))
      room = roomArt(s.W, s.H, feet)
      cone = coneArt(feet + 2, 16, 60, '#9cc0ff')
      const n = Math.round((s.W * feet) / 1800)
      crowd = Array.from({ length: n }, (_, i) => ({
        idx: civRemy(ihash(REMY_COUNT, i, 41)),
        x: 4 + ihash(Math.max(1, s.W - 24), i, 43),
        y: ihash(Math.max(20, feet - 60), i, 47),
        period: 2400 + ihash(2600, i, 53),
      }))
    },
  )
  void loadSprite(prof)
  return {
    async summon(idx) {
      await loadSprite(idx)
      pair = { from: pairAt(st.t), to: 1, t0: st.t }
      remy = { idx, t0: st.t, leaving: false }
      if (crowdT0 < 0) crowdT0 = st.t
      await sleep(1250)
      sparkleBurst(fx, Math.floor(st.W / 2) + dx, feet - 60, 12, 60, '#c4d6ff')
    },
    async dismiss() {
      if (remy) remy = { ...remy, t0: st.t, leaving: true }
      pair = { from: pairAt(st.t), to: 0, t0: st.t }
      await sleep(700)
    },
    async irisOut() {
      irisT0 = st.t
      await sleep(1250)
    },
  }
}

// ───────────── Starter lab ─────────────

/**
 * White lab plinth with a type-colored band (52×22, top-face centre at (26, 5)). The front face carries the DOM type
 * badge on the left and the token number, painted here, on the right.
 */
function pedestalArt(num: string, band: string): HTMLCanvasElement {
  const p = new Px(52, 22)
  const side = ['#aebbe6', '#8fa0d4', '#7486c4', '#6474b8', '#5a6bb0', '#4d5da3', '#44529a', '#3f4c92', band, shadeHex(band, -0.35), '#2e3a78']
  for (let dy = side.length - 1; dy >= 0; dy--) p.ellipse(26, 5 + dy, 24, 4, hex(side[dy]))
  const face = ['#ffffff', '#eef3ff', '#d6e0f6', '#b9c6ea'].map((h) => hex(h))
  p.ellipse(26, 5, 24, 4, (x, y, nx, ny) => {
    const d = (nx + 0.25) ** 2 + (ny + 0.3) ** 2 + (bayer(x, y) - 0.5) * 0.15
    return d < 0.25 ? face[0] : d < 0.6 ? face[1] : d < 1 ? face[2] : face[3]
  })
  p.outline(hex(PAL.ink))
  tinyText(p, num, 48 - textWidth(num), 11, hex('#ffffff'), 1, hex('#1c2a78'))
  return p.toCanvas()
}

/** Blinking gold ring traced on the selected plinth's top face. */
function ringArt(): HTMLCanvasElement {
  const p = new Px(52, 12)
  const gold = hex(PAL.gold)
  const light = hex('#fff3b8')
  p.ellipse(26, 6, 24, 4.5, (_x, _y, nx, ny) => (nx * nx + ny * ny > 0.62 ? (ny < 0 ? light : gold) : 0))
  return p.toCanvas()
}

/** Prof's lab: paneled wall with lamps over each plinth, tiled floor, and the title chip. */
function labArt(W: number, H: number, floor: number, lamps: number[], title: string): HTMLCanvasElement {
  const p = new Px(W, H)
  const wall = hex('#c8d4f0')
  const seam = hex('#9aaad8')
  const lit = hex('#e2e9fb')
  for (let y = 0; y < floor; y++)
    for (let x = 0; x < W; x++) {
      const s = (x + 20) % 40
      p.put(x, y, s === 0 ? seam : s === 1 ? lit : y > floor - 30 && bayer(x, y) < (y - floor + 30) / 60 ? hex('#b4c2e8') : wall)
    }
  p.rect(0, 0, W, 5, hex('#6b7fc4'))
  p.hl(0, 5, W, hex('#3a4688'))
  p.hl(0, 0, W, hex('#8fa0d4'))
  const wain = floor - 20
  p.rect(0, wain, W, 20, hex('#5a6bb0'))
  p.hl(0, wain, W, hex('#e2e9fb'))
  p.hl(0, wain + 1, W, hex('#9aaad8'))
  for (let x = 4; x < W; x += 8) p.vl(x, wain + 3, 16, hex('#4b5aa0'))
  p.hl(0, floor - 1, W, hex('#2e3a78'))
  const tileA = hex('#eef1fa')
  const tileB = hex('#dfe5f5')
  const grout = hex('#b9c3e0')
  for (let y = floor; y < H; y++)
    for (let x = 0; x < W; x++) {
      const row = Math.floor((y - floor) / 8)
      const tx = x + (row % 2) * 8
      const edge = (y - floor) % 8 === 7 || tx % 16 === 15
      const near = y - floor < 3 && bayer(x, y) < 0.6
      p.put(x, y, near ? grout : edge ? grout : (Math.floor(tx / 16) + row) % 2 ? tileA : tileB)
    }
  for (const x of lamps) {
    p.vl(x, 6, 4, hex(PAL.ink))
    p.rect(x - 5, 10, 11, 3, hex('#3a4688'))
    p.hl(x - 4, 10, 9, hex('#6b7fc4'))
    p.hl(x - 6, 13, 13, hex(PAL.ink))
    p.hl(x - 3, 13, 7, hex('#fff3b8'))
  }
  const c = p.toCanvas()
  const g = c.getContext('2d') as CanvasRenderingContext2D
  // The title chip only shows where the Remys' heads leave room for it (tall screens).
  if (!title) return c
  const tw = glyphs(title).w
  const x0 = Math.floor((W - tw) / 2) - 6
  g.fillStyle = PAL.ink
  g.fillRect(x0, 17, tw + 12, 13)
  g.fillStyle = '#1e2766'
  g.fillRect(x0 + 1, 18, tw + 10, 11)
  g.fillStyle = '#3b4a9c'
  g.fillRect(x0 + 1, 18, tw + 10, 1)
  drawText(g, title, Math.floor(W / 2), 20, '#ffffff', { shadow: PAL.ink }, 'center')
  return c
}

/**
 * The four starters on plinths. The `.st-card` elements (tap targets carrying sel/chosen/taken) are positioned over
 * each plinth; the painting follows their classes every frame.
 */
export function labStage(host: HTMLElement, idxs: number[], cards: HTMLElement[], typeColors: string[]) {
  const still = reducedMotion()
  const fx: Particle[] = []
  const peds = idxs.map((idx, i) => pedestalArt(String(idx), typeColors[i]))
  const ring = ringArt()
  let bg = peds[0]
  let spot = peds[0]
  let feet = 0
  let xs: number[] = []
  const since = idxs.map(() => ({ sel: -1, chosen: -1 }))
  stage(
    host,
    (s) => {
      const { g, t, dt } = s
      g.drawImage(bg, 0, 0)
      for (const [i, idx] of idxs.entries()) {
        const c = cards[i].classList
        const mark = since[i]
        if (c.contains('sel') !== mark.sel >= 0) mark.sel = c.contains('sel') ? t : -1
        if (c.contains('chosen') && mark.chosen < 0) {
          mark.chosen = t
          sparkleBurst(fx, xs[i], feet - 50, 18, 80)
        }
        const x = xs[i]
        const lit = mark.sel >= 0 || mark.chosen >= 0
        const taken = c.contains('taken')
        // While picking, everyone but the selected Remy steps back into the shade.
        const picking = since.some((m) => m.sel >= 0 || m.chosen >= 0)
        if (lit && !taken) g.drawImage(spot, x - (spot.width >> 1), 14)
        g.drawImage(peds[i], x - 26, feet - 5)
        if (lit && !taken && Math.floor(t / 260) % 3) g.drawImage(ring, x - 26, feet - 6)
        let lift = 0
        if (taken) lift = 0
        else if (mark.chosen >= 0) {
          const e = t - mark.chosen
          lift = e < 1500 ? Math.round(Math.abs(Math.sin((e / 500) * Math.PI)) * 8) : Math.floor(t / 300) % 2
        } else if (mark.sel >= 0 && !still) {
          const e = (t - mark.sel) % 720
          lift = e < 300 ? Math.round(Math.sin((e / 300) * Math.PI) * 5) : 0
        } else if (!still) lift = Math.floor((t + i * 310) / 520) % 2
        drawShadow(g, x, feet, 34)
        const variant = taken
          ? 'dim'
          : mark.chosen >= 0 && t - mark.chosen < 900 && Math.floor((t - mark.chosen) / 110) % 2
            ? 'gold'
            : picking && !lit
              ? 'shade'
              : 'plain'
        drawSprite(g, idx, x, feet - lift, variant)
        if (!still && lit && !taken && Math.random() < 0.08)
          spawn(fx, { kind: 'spark', x: x + (Math.random() - 0.5) * 44, y: feet - 20 - Math.random() * 80, max: 460, c: PAL.gold })
      }
      particles(g, fx, dt)
    },
    (s) => {
      const { W, H } = s
      // Plinth + badge end 15px below the soles, clear of the speaker plate (66px above the bottom).
      feet = H - 83
      const pitch = Math.min(66, Math.floor((W - 12) / idxs.length))
      xs = idxs.map((_, i) => Math.round(W / 2 + (i - (idxs.length - 1) / 2) * pitch))
      bg = labArt(W, H, feet - 20, xs, feet - SPRITE_FEET >= 34 ? 'CHOOSE YOUR PARTNER' : '')
      spot = coneArt(feet - 12, 12, 56, '#fff2b0')
      for (const [i, card] of cards.entries()) {
        card.style.left = `${xs[i] - 26}rem`
        card.style.top = `${feet - 100}rem`
      }
    },
  )
}

// ───────────── Hall of Fame ─────────────

export interface Inductee {
  idx: number
  name: string
  level: number
}

export interface FameStage {
  /** The collection wall assembles head by head behind the dedication. */
  dedicate(known: number[]): Promise<void>
  /** Beams party member `i` into its place on the shelf. */
  induct(i: number): Promise<void>
}

/** Eight baked frames of a dithered searchlight sweeping up from the bottom-left corner. */
function searchlight(W: number, H: number): HTMLCanvasElement[] {
  const col = hex('#fff2b0', 40)
  return Array.from({ length: 8 }, (_, f) => {
    const p = new Px(W, H)
    const aim = 0.55 + Math.sin((f / 8) * Math.PI * 2) * 0.3
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const a = Math.atan2(H - y, x + 20)
        const off = Math.abs(a - aim)
        if (off > 0.09) continue
        const k = (1 - off / 0.09) * (1 - Math.hypot(x, H - y) / (W * 1.3))
        if (k * 0.8 > bayer(x, y)) p.put(x, y, col)
      }
    return p.toCanvas()
  })
}

const CONFETTI = ['#27c46b', '#ec4a4a', '#2f8cff', '#b35cff', '#ffd34a', '#ffffff']

export function fameStage(host: HTMLElement, party: Inductee[]): FameStage {
  const still = reducedMotion()
  const fx: Particle[] = []
  const title = lettering([{ str: 'HALL OF FAME', k: 2, face: GOLD_FACE, rim: PAL.goldInk }])
  let cells: { idx: number; x: number; y: number; delay: number }[] = []
  let wallT0 = -1
  let dimmed = false
  let wallBaked: HTMLCanvasElement | null = null
  let sky = title.img
  let beams: HTMLCanvasElement[] = []
  let feet = 0
  let xs: number[] = []
  let dedication = false
  const shown: number[] = []
  let current = -1
  let currentT0 = 0
  for (const r of party) void loadSprite(r.idx)
  let cone = title.img
  const lvCanvases = new Map<string, HTMLCanvasElement>()
  const lvCache = (label: string) => {
    let c = lvCanvases.get(label)
    if (!c) {
      const p = new Px(textWidth(label) + 1, 6)
      tinyText(p, label, 0, 0, hex('#fff0b0'), 1, hex('#3a1a04'))
      c = p.toCanvas()
      lvCanvases.set(label, c)
    }
    return c
  }
  let known: number[] = []
  const st = stage(
    host,
    (s) => {
      const { g, W, H, t, dt } = s
      g.drawImage(sky, 0, 0)
      if (wallT0 >= 0) {
        const e = t - wallT0
        if (wallBaked) g.drawImage(wallBaked, 0, 0)
        else
          for (const c of cells) {
            const k = e - c.delay
            if (k < 0) continue
            if (k < 70) {
              g.fillStyle = '#ffffff'
              g.fillRect(c.x + 2, c.y + 2, 12, 12)
              continue
            }
            const head = art.head(c.idx)
            if (head) g.drawImage(head.img, head.sx, head.sy, head.sw, head.sh, c.x, c.y, 16, 16)
          }
      }
      if (dimmed) {
        g.fillStyle = 'rgba(8,8,30,0.74)'
        g.fillRect(0, 0, W, H)
        const f = still ? 0 : Math.floor(t / 180) % 8
        g.drawImage(beams[f], 0, 0)
        g.save()
        g.translate(W, 0)
        g.scale(-1, 1)
        g.drawImage(beams[(f + 4) % 8], 0, 0)
        g.restore()
      }
      if (dedication) {
        const cy = Math.floor(H / 2) - 12
        const w = glyphs('EVERY REMY. EVERY MEMORY.').w + 14
        const x0 = Math.floor((W - w) / 2)
        g.fillStyle = PAL.ink
        g.fillRect(x0, cy, w, 27)
        g.fillStyle = '#1e2766'
        g.fillRect(x0 + 1, cy + 1, w - 2, 25)
        drawText(g, 'EVERY REMY. EVERY MEMORY.', Math.floor(W / 2), cy + 5, '#ffffff', { shadow: PAL.ink }, 'center')
        drawText(g, 'ONE LEGEND.', Math.floor(W / 2), cy + 15, PAL.gold, { shadow: PAL.ink }, 'center')
      }
      if (!dimmed) return
      drawLogo(g, title, Math.floor((W - title.img.width) / 2), 3, still ? -1 : (t % 3800) / 1000)
      // Gold shelf the party stands on.
      if (xs.length) {
        const x0 = xs[0] - 30
        const w = xs[xs.length - 1] - xs[0] + 60
        const rows = ['#10132e', '#fff0b0', '#ffd34a', '#ffd34a', '#e5961c', '#7a3d0c', '#7a3d0c', '#7a3d0c', '#7a3d0c', '#7a3d0c', '#5a2a08', '#10132e']
        for (const [j, c] of rows.entries()) {
          g.fillStyle = c
          g.fillRect(x0 + (j === 0 || j === rows.length - 1 ? 1 : 0), feet - 2 + j, w - (j === 0 || j === rows.length - 1 ? 2 : 0), 1)
        }
      }
      for (const i of shown) {
        const r = party[i]
        const x = xs[i]
        const fresh = i === current ? t - currentT0 : 1e9
        if (fresh < 1200) {
          const beamH = Math.round(Math.min(1, fresh / 250) * feet)
          g.drawImage(cone, 0, 0, cone.width, beamH, x - (cone.width >> 1), 0, cone.width, beamH)
        }
        drawShadow(g, x, feet, 34)
        const bob = still ? 0 : Math.floor((t + i * 270) / 500) % 2
        if (fresh < 1100) drawMaterialize(g, r.idx, x, feet, (fresh - 200) / 800)
        else drawSprite(g, r.idx, x, feet - bob, fresh < 1400 ? 'gold' : 'plain')
        const lv = lvCache(`LV${r.level}`)
        g.drawImage(lv, x - (lv.width >> 1), feet + 4)
      }
      // The newest inductee's name sits under the shelf, where the dialogue box will later go.
      if (current >= 0 && t - currentT0 < 2400) {
        const r = party[current]
        drawText(g, `${r.name}  Lv${r.level}`, Math.floor(W / 2), feet + 17, '#ffffff', { outline: PAL.ink }, 'center')
      }
      if (!still && Math.random() < 0.35)
        spawn(fx, {
          kind: 'confetti',
          x: Math.random() * W,
          y: -2,
          vx: (Math.random() - 0.5) * 16,
          vy: 14 + Math.random() * 16,
          max: 9000,
          c: CONFETTI[Math.floor(Math.random() * CONFETTI.length)],
        })
      particles(g, fx, dt)
    },
    (s) => {
      const { W, H } = s
      sky = bands(W, H, NIGHT).toCanvas()
      const sg = sky.getContext('2d') as CanvasRenderingContext2D
      drawStars(sg, starfield(W, H, Math.round((W * H) / 500), 23), 0)
      beams = searchlight(W, H)
      feet = Math.max(116, H - 78)
      const n = party.length
      const pitch = Math.min(62, Math.floor((W - 12) / Math.max(1, n)))
      xs = party.map((_, i) => Math.round(W / 2 + (i - (n - 1) / 2) * pitch))
      cone = coneArt(feet, 20, 44, '#fff6d0')
      const ox = Math.floor(((W % 18) - 16) / 2)
      const oy = Math.floor(((H % 18) - 16) / 2)
      cells = []
      for (let y = oy; y < H; y += 18) for (let x = ox; x < W; x += 18) cells.push({ idx: 0, x, y, delay: 0 })
      assign()
    },
  )
  function assign() {
    wallBaked = null
    for (const [i, c] of cells.entries()) {
      c.idx = known[i] ?? civRemy((i * 977 + 13) % REMY_COUNT)
      c.delay = ihash(1600, i, 61) + (i < known.length ? 0 : 200)
    }
    if (wallT0 >= 0) bake()
  }
  function bake() {
    const c = canvas(st.W, st.H)
    const g = c.getContext('2d') as CanvasRenderingContext2D
    for (const cell of cells) {
      const head = art.head(cell.idx)
      if (head) g.drawImage(head.img, head.sx, head.sy, head.sw, head.sh, cell.x, cell.y, 16, 16)
    }
    wallBaked = c
  }
  return {
    async dedicate(list) {
      known = list
      assign()
      wallT0 = st.t
      dedication = true
      await sleep(still ? 300 : 2100)
      bake()
      await sleep(1500)
      dedication = false
      dimmed = true
    },
    async induct(i) {
      shown.push(i)
      current = i
      currentT0 = st.t
      sparkleBurst(fx, xs[i], feet - 60, 12, 70)
      for (let k = 0; k < 24; k++)
        spawn(fx, {
          kind: 'confetti',
          x: xs[i] + (Math.random() - 0.5) * 30,
          y: feet - 110,
          vx: (Math.random() - 0.5) * 90,
          vy: -40 - Math.random() * 40,
          ay: 120,
          max: 2200,
          c: CONFETTI[k % CONFETTI.length],
        })
      await sleep(1250)
    },
  }
}

// ───────────── Credits ─────────────

export type Credit = ['logo' | 'h1' | 'h2' | 'p' | 'gap', string]

/**
 * Credits roll in crisp 8px text over a night sky while `walkers` march along the meadow below. Resolves when the
 * last line comes to rest; holding A fast-forwards.
 */
export function creditsStage(host: HTMLElement, lines: Credit[], walkers: number[], fast: () => boolean): Promise<void> {
  const still = reducedMotion()
  const mark = logo(3, 2)
  const end = lettering([{ str: 'THE END', k: 2, face: GOLD_FACE, rim: PAL.goldInk }])
  const heights = lines.map(([kind]) =>
    kind === 'logo' ? mark.img.height + 8 : kind === 'h1' ? end.img.height + 6 : kind === 'h2' ? 18 : kind === 'gap' ? 14 : 11,
  )
  const total = heights.reduce((a, b) => a + b, 0)
  let sky = mark.img
  let moon = mark.img
  let hills = hillStrip()
  let ground = mark.img
  let stars = starfield(1, 1, 0, 1)
  let scroll = 0
  let done: () => void = () => {}
  const finished = new Promise<void>((r) => {
    done = r
  })
  let resolved = false
  stage(
    host,
    (s) => {
      const { g, W, H, t, dt } = s
      const band = H - 40
      g.drawImage(sky, 0, 0)
      drawStars(g, stars, t)
      g.drawImage(moon, W - moon.width - 10, 8)
      const rest = Math.max(8, Math.floor(band * 0.18))
      const stop = band + 4 - rest
      const endStart = total - heights[heights.length - 1] - heights[heights.length - 2]
      scroll = Math.min(stop + endStart, scroll + (dt / 1000) * (still ? 60 : fast() ? 110 : 24))
      let y = band + 4 - Math.floor(scroll)
      for (const [i, [kind, str]] of lines.entries()) {
        const h = heights[i]
        if (y + h > -12 && y < band) {
          const cx = Math.floor(W / 2)
          if (kind === 'logo') drawLogo(g, mark, cx - (mark.img.width >> 1), y, (t % 4000) / 1000)
          else if (kind === 'h1') drawLogo(g, end, cx - (end.img.width >> 1), y, (t % 4000) / 1000)
          else if (kind === 'h2') drawText(g, str, cx, y + 6, PAL.gold, { outline: PAL.ink }, 'center')
          else if (kind === 'p') drawText(g, str, cx, y, '#ffffff', { shadow: PAL.ink }, 'center')
        }
        y += h
      }
      if (!resolved && scroll >= stop + endStart) {
        resolved = true
        placeMenu(W, band + 4 - Math.floor(scroll) + total + 4, 132)
        done()
      }
      tileX(g, hills, still ? 0 : t * 0.012, H - 44, W)
      tileX(g, ground, still ? 0 : t * 0.03, H - ground.height, W)
      const frame = still ? 0 : Math.floor(t / 150) % 4
      for (const [i, idx] of walkers.entries())
        drawRemyActor(g, idx, 'right', frame, Math.floor(W / 2) + 20 - i * 20, H - 23)
    },
    (s) => {
      sky = bands(s.W, s.H, NIGHT).toCanvas()
      moon = sunArt(12)
      hills = hillStrip()
      ground = meadow(Math.max(64, s.W), 16)
      stars = starfield(s.W, s.H - 50, Math.round((s.W * s.H) / 600), 31)
    },
  )
  return finished
}
