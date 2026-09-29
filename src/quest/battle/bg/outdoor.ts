import { PALS } from '../../gfx/palette'
import { type Col, Px, hash, hex, mix, rng, shade } from '../../gfx/px'
/** Open-air battle backdrops: Genesis Town, Mempool Meadow and Rug Pull Canyon. */
import type { BackdropGeo } from '../backdrops'
import {
  type PadStyle,
  type Scene,
  TAU,
  WPx,
  band,
  bayer,
  buildPad,
  cloud,
  dither,
  drawGround,
  groundRows,
  layerW,
  padCache,
  plates,
  sky,
  spr,
  tile,
  wave,
} from './kit'

const H = (...s: string[]) => s.map((c) => hex(c))

// ---------------------------------------------------------------------------------------------------------------
// Shared grass pieces (town + meadow)

type Grass = typeof PALS.town

/** Grass tufts by size class; 'l' = light blade, 'd' = shadow blade. */
const TUFTS: readonly (readonly string[])[] = [
  ['d.d'],
  ['l.l', '.d.'],
  ['l...l', 'dl.ld', '.d.d.'],
  ['.l....l.', '.dl..ld.', 'l.dlld.l', 'd..dd..d'],
]

function stampTuft(p: Px, rows: readonly string[], x: number, y: number, l: Col, d: Col): void {
  for (let j = 0; j < rows.length; j++)
    for (let i = 0; i < rows[j].length; i++) {
      const ch = rows[j][i]
      if (ch === 'l') p.set(x + i, y + j, l)
      else if (ch === 'd') p.set(x + i, y + j, d)
    }
}

/**
 * Perspective grass field: mowed stripes that widen toward the viewer, a hazy far edge, tufts and flower specks
 * sized by depth. `sway` shifts flower heads by one pixel for the alternate animation frame.
 */
function grassField(g: BackdropGeo, LW: number, pal: Grass, haze: Col, seed: number, flowers: number, sway = 0): WPx {
  const hz = Math.round(g.horizon)
  const gh = g.H - hz
  const p = new WPx(LW, gh)
  const rows = groundRows(hz, g.H, g.me.feet, 0.2)
  const f = pal.field
  const ramp = [...f, haze]
  let j = 0
  for (let y = 0; y < gh; y++) {
    while (j < rows.length - 1 && rows[j][0] - hz < y) j++
    // Stripes only once rows are wide enough to read; far off they would just be noise.
    const wide = j > 0 && rows[j][0] - rows[j - 1][0] >= 3
    const stripe = wide && j % 2 === 0 ? 0.7 : 0
    const far = (1 - y / gh) ** 2 * 1.1 + Math.exp(-y / 4) * 1.6
    for (let x = 0; x < LW; x++) p.d[y * LW + x] = band(ramp, 1.9 + stripe + far, x, y, 0.35)
  }
  const r = rng(seed)
  // Flower heads scale with depth: a dot far off, a 3px blossom mid-field, a plus-shaped bloom up close.
  const flower = (fx: number, y: number, s: number, col: Col) => {
    const fy = y - 2 - (s > 0.9 ? 1 : 0)
    const sx = s > 0.8 && hash(fx, fy, seed) < 0.5 ? sway : 0
    p.set(fx, fy + 1, f[0])
    p.set(fx + sx, fy, col)
    if (s > 0.55 && s <= 0.8) p.set(fx + sx + 1, fy, shade(col, -0.3))
    if (s > 0.8) {
      p.set(fx + sx - 1, fy, col)
      p.set(fx + sx, fy - 1, col)
      p.set(fx + sx + 1, fy, col)
      p.set(fx + sx, fy + 1, shade(col, -0.35))
      p.set(fx + sx, fy, pal.flowers[2])
      p.set(fx, fy + 2, f[0])
    }
  }
  const pick = () => pal.flowers[Math.floor(r() * pal.flowers.length)]
  for (let ri = 0; ri < rows.length; ri++) {
    const [ry, s] = rows[ri]
    const y = Math.round(ry - hz)
    // Far rows are only a pixel or two apart: thin them so the distance reads calm, not as a carpet of specks.
    if (s < 0.22 || (s < 0.7 && ri % 2 === 1)) continue
    const gap = Math.max(12, 28 * s)
    for (let x = r() * gap; x < LW; x += gap * (0.6 + r() * 0.8)) {
      const cls = s < 0.3 ? 0 : s < 0.6 ? 1 : s < 1.05 ? 2 : 3
      const t = TUFTS[cls]
      const hazeK = Math.max(0, 1 - s * 2) * 0.5
      stampTuft(p, t, Math.round(x), y - t.length, mix(f[4], haze, hazeK), mix(f[0], haze, hazeK))
      if (s > 0.35 && r() < flowers * 0.5) flower(Math.round(x + gap * 0.5 + (r() - 0.5) * 6), y, s, pick())
    }
  }
  // Patches: a dominant colour clustered over a few neighbouring rows, as wildflowers actually grow.
  const near = rows.filter(([, s]) => s > 0.35)
  for (let k = 0; k < Math.round((flowers * LW) / 22); k++) {
    const ri = Math.floor(r() * near.length)
    const cx = r() * LW
    const main = pick()
    for (let i = 0; i < 4 + r() * 6; i++) {
      const [ry, s] = near[Math.max(0, Math.min(near.length - 1, ri + Math.round((r() - 0.5) * 2.4)))]
      flower(Math.round(cx + (r() - 0.5) * 22 * s), Math.round(ry - hz), s, r() < 0.75 ? main : pal.flowers[1])
    }
  }
  return p
}

/** Dark loam for turf lips: GBA pads sit on a rich brown band, not sand. */
const SOIL = H('#2e1c16', '#4e3022', '#6c472e', '#8c6440', '#ab8458')

function grassPad(pal: Grass, seed: number): (rx: number, ry: number) => HTMLCanvasElement {
  const t = pal.tall
  const style: PadStyle = {
    top(x, y, _nx, ny, lit) {
      const h = hash(x >> 1, y, seed)
      if (h < 0.06 && ny > -0.7) return t[1]
      if (h > 0.97 && lit > 0) return t[4]
      return dither(t, 2.2 + lit * 1.5, x, y)
    },
    side(x, k, nx) {
      if (k < 1 + (hash(x, 1, seed) > 0.55 ? 1 : 0)) return t[1]
      if (hash(x, k, seed + 1) < 0.06) return SOIL[4]
      return dither(SOIL, 3.3 - k * 0.35 - Math.max(0, nx) * 1.3 + Math.max(0, -nx) * 0.4, x, k)
    },
    rim: shade(t[0], -0.35),
    edge: t[4],
    lip: t[1],
    post(p, cx, cy, ax, ay) {
      // Blades poking over the back edge so the disc reads as a clump of turf, not a flat plate.
      for (let x = Math.round(cx - ax + 3); x < cx + ax - 3; x++) {
        if (hash(x, 3, seed) > 0.3) continue
        const nx = (x + 0.5 - cx) / ax
        const yt = Math.ceil(cy - ay * Math.sqrt(Math.max(0, 1 - nx * nx)))
        p.set(x, yt - 1, nx < 0.2 ? t[4] : t[3])
      }
    },
  }
  return padCache((rx, ry) => buildPad(rx, ry, style))
}

// ---------------------------------------------------------------------------------------------------------------
// Genesis Town: bright morning, drifting clouds, hills with tiny rooftops and a faint green candle-chart ridge.

const BIRD = [
  ['d...d', '.d.d.'],
  ['.....', 'ddddd'],
]

export function town(g: BackdropGeo): Scene {
  const pal = PALS.town
  const { W } = g
  const hz = Math.round(g.horizon)
  const LW = layerW(W)
  const skyRamp = H('#4a86e0', '#5f9aec', '#78aef2', '#92c2f6', '#aed4f8', '#c9e4f8', '#e2f0f2')
  const skyImg = sky(W, hz, skyRamp, 1.25).toCanvas()

  const cloudsFar = new WPx(LW, hz)
  const cloudsNear = new WPx(LW, hz)
  const farPal = H('#a6c4ec', '#c8def6', '#e4f0fb', '#f8fcff')
  const nearPal = H('#9eb2e2', '#d8e8f8', '#f2f8ff', '#ffffff')
  {
    const r = rng(11)
    for (let x = 0; x < LW; x += 50 + r() * 50)
      cloud(cloudsFar, x, Math.round(hz * (0.2 + r() * 0.35)), 18 + r() * 16, 5 + r() * 3, x, farPal)
    for (let x = 20; x < LW; x += 90 + r() * 70)
      cloud(cloudsNear, x, Math.round(hz * (0.18 + r() * 0.3)) + 8, 34 + r() * 26, 9 + r() * 5, x + 3, nearPal)
  }

  // Farthest: a ridge whose skyline is a green candle chart, washed out by distance.
  const rh = Math.max(18, Math.round(hz * 0.72))
  const ridge = new WPx(LW, rh)
  {
    const mass = hex('#9ec6cc')
    const upL = hex('#b8ecd0')
    const up = hex('#7cc6a4')
    const dn = hex('#8eb8bc')
    const cw = 8
    const n = Math.floor(LW / cw)
    const close = (i: number) => {
      const k = ((i % n) + n) % n
      return rh * 0.26 + wave(k * cw, n * cw, LW / 1.5, 21, 2) * rh * 0.16 + (hash(k, 0, 21) - 0.5) * rh * 0.2
    }
    for (let i = 0; i < n; i++) {
      const o = close(i - 1)
      const c = close(i)
      const top = Math.round(Math.min(o, c))
      const bot = Math.max(top + 2, Math.round(Math.max(o, c)))
      const x = i * cw
      const col = c < o ? up : dn
      ridge.rect(x - 1, top + 2, cw + 1, rh - top, mass)
      ridge.vl(x + 2, top - 2 - Math.round(hash(i, 1, 21) * 2), 3, col)
      ridge.rect(x, top, 5, bot - top + 1, col)
      if (c < o) ridge.vl(x, top, bot - top + 1, upL)
    }
  }

  // Far hills with tiny rooftops.
  const fh = Math.max(14, Math.round(hz * 0.4) + 4)
  const hills = new WPx(LW, fh)
  {
    const ramp = H('#76b0a6', '#86c0ac', '#98ceb4', '#b2dcbe')
    const top = (x: number) => fh * 0.3 + wave(x, LW, 110, 31, 3) * fh * 0.18
    for (let x = 0; x < LW; x++) {
      const t = Math.round(top(x))
      for (let y = t; y < fh; y++) hills.set(x, y, dither(ramp, 3 - (y - t) * 0.22 - (top(x + 2) - top(x)) * 0.6, x, y))
    }
    const r = rng(33)
    const roofs = H('#c8847c', '#8494c8', '#d4a468', '#b07ca8')
    for (let x = 8; x < LW - 4; x += 16 + r() * 36) {
      const cnt = 1 + Math.floor(r() * 3)
      for (let k = 0; k < cnt; k++) {
        const hx = Math.round(x + k * 6)
        const base = Math.round(top(hx + 2)) + 2
        const roof = roofs[Math.floor(r() * roofs.length)]
        hills.rect(hx, base - 3, 5, 3, hex('#eee6d6'))
        hills.hl(hx + 1, base - 5, 3, roof)
        hills.hl(hx, base - 4, 5, roof)
        hills.set(hx + 2, base - 2, hex('#8a90b0'))
        hills.hl(hx, base - 1, 5, hex('#b8c8c0'))
      }
      if (r() < 0.6) {
        const tx = Math.round(x + cnt * 6 + 2)
        const tb = Math.round(top(tx + 1)) + 1
        hills.rect(tx, tb - 4, 3, 3, hex('#6aa894'))
        hills.hl(tx, tb - 5, 2, hex('#86bca4'))
      }
    }
  }

  // Tree line right on the horizon: the darkest, most saturated far layer.
  const th = Math.max(10, Math.round(hz * 0.22) + 6)
  const trees = new WPx(LW, th)
  {
    const t = pal.tree
    const ramp = [mix(t[1], hex('#8ec8b0'), 0.25), mix(t[2], hex('#8ec8b0'), 0.2), t[3], t[4]]
    const r = rng(41)
    const blobs: [number, number, number][] = []
    for (let x = 0; x < LW; x += 5 + r() * 7) blobs.push([x, th - 2 - r() * (th * 0.35), 3 + r() * (th * 0.35)])
    for (const [bx, by, br] of blobs)
      for (let dx = -Math.ceil(br) - 1; dx <= br + 1; dx++)
        for (let y = Math.floor(by - br); y < th; y++) {
          const nx = dx / br
          const ny = (y - by) / br
          if (y < by && nx * nx + ny * ny > 1) continue
          if (Math.abs(nx) > 1) continue
          trees.set(bx + dx, y, dither(ramp, 1.2 - nx * 0.9 - ny * 1.1, bx + dx, y))
        }
    for (let x = 0; x < LW; x++)
      for (let y = 1; y < th; y++)
        if (trees.get(x, y) && !trees.get(x, y - 1)) trees.put(x, y - 1, mix(t[0], hex('#8ec8b0'), 0.35))
  }

  const haze = hex('#c6e8b8')
  const ground = grassField(g, LW, pal, haze, 51, 0.28).toCanvas()
  const layers = [
    [ridge.toCanvas(), hz - rh + 2, 0.12],
    [hills.toCanvas(), hz - fh + 2, 0.22],
    [trees.toCanvas(), hz - th + 1, 0.35],
  ] as const
  const cf = cloudsFar.toCanvas()
  const cn = cloudsNear.toCanvas()
  const birds = BIRD.map((b) => spr(b, { d: hex('#3a4a78') }))

  return {
    draw(ctx, t, camX) {
      ctx.drawImage(skyImg, 0, 0)
      tile(ctx, cf, camX * 0.06 + t * 1.5, 0, W)
      tile(ctx, cn, camX * 0.1 + t * 4, 0, W)
      // A small flock crosses every ~24s.
      const bt = (t % 24) / 24
      for (let i = 0; i < 3; i++) {
        const bx = Math.round(-20 + bt * (W + 60) - i * 7 + camX * 0.1)
        const by = Math.round(hz * 0.3 + i * 3 + Math.sin(t * 2 + i) * 1.5)
        ctx.drawImage(birds[Math.floor(t * 5 + i) & 1], bx, by)
      }
      for (const [img, y, par] of layers) tile(ctx, img, camX * par, y, W)
      drawGround(ctx, ground, g, camX)
    },
    pad: grassPad(pal, 5),
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Shared silhouettes

/** Rolling hill layer: left-facing slopes lit, dithered darker down into the valleys. */
function rolling(
  LW: number,
  h: number,
  ramp: readonly Col[],
  seed: number,
  wl: number,
  base: number,
  amp: number,
): WPx {
  const p = new WPx(LW, h)
  const top = (x: number) => h * base + wave(x, LW, wl, seed, 3) * h * amp
  for (let x = 0; x < LW; x++) {
    const t = Math.round(top(x))
    const slope = top(x + 2) - top(x - 2)
    for (let y = Math.max(0, t); y < h; y++) {
      const v = 2.2 - slope * 0.35 - ((y - t) / h) * 1.6 + (y === t ? 1 : 0)
      p.set(x, y, dither(ramp, v, x, y))
    }
  }
  return p
}

/** Sun with a hard core, stepped rings and an ordered-dither halo fading into the sky. */
function sunDisc(p: Px, cx: number, cy: number, R: number, ring: readonly Col[]): void {
  const RR = R * 2.2
  for (let y = Math.floor(cy - RR); y <= cy + RR; y++)
    for (let x = Math.floor(cx - RR); x <= cx + RR; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
      if (d <= R) p.set(x, y, d < R * 0.72 ? ring[0] : ring[1])
      else if (d <= R + 2) p.set(x, y, ring[2])
      else if (d <= RR && 1 - (d - R - 2) / (RR - R - 2) > bayer(x, y) * 1.6) p.set(x, y, ring[3])
    }
}

/** Drifting particles (petals, ash, dust) wrapped over [0,W)×[y0,y1); positions are pure functions of t. */
function drift(
  ctx: CanvasRenderingContext2D,
  t: number,
  camX: number,
  n: number,
  W: number,
  y0: number,
  y1: number,
  vx: number,
  vy: number,
  cols: readonly string[],
): void {
  const span = y1 - y0
  for (let i = 0; i < n; i++) {
    const sx =
      hash(i, 1, 91) * (W + 20) + t * vx * (0.7 + hash(i, 2, 91) * 0.6) + Math.sin(t * 1.3 + i * 2.1) * 5 + camX
    const sy = hash(i, 3, 91) * span + t * vy * (0.7 + hash(i, 4, 91) * 0.6)
    const x = Math.round((((sx % (W + 20)) + W + 20) % (W + 20)) - 10)
    const y = Math.round(y0 + (((sy % span) + span) % span))
    ctx.fillStyle = cols[i % cols.length]
    // Two-frame tumble: a flake alternates between a flat and an upright sliver.
    if ((Math.floor(t * 4 + i) & 1) === 0) ctx.fillRect(x, y, 2, 1)
    else ctx.fillRect(x, y, 1, 2)
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Mempool Meadow: sunny, big stepped-ray sun, rolling hills, tall-grass fringe, swaying flowers, butterflies.

const FLY = [
  ['aa.aa', 'aabaa', '.a.a.'],
  ['.....', '.aba.', '..a..'],
]

export function meadow(g: BackdropGeo): Scene {
  const pal = PALS.meadow
  const { W } = g
  const hz = Math.round(g.horizon)
  const LW = layerW(W)
  const skyImg = sky(W, hz, H('#3a7ee4', '#4f94ee', '#6aaaf2', '#88c0f4', '#a8d4f2', '#c8e4ea', '#e6f0d2'), 1.2)

  // Sun + two ray frames (rays rotate half a wedge between them) so the glare pulses.
  const R = Math.round(Math.max(6, Math.min(15, hz * 0.17)))
  const scx = Math.round(W * 0.3)
  const scy = Math.round(Math.max(R + 4, hz * 0.34))
  const rayLen = R * 4
  const rayCol = hex('#fff6c8')
  const rays = [0, 1].map((f) => {
    const p = new Px(rayLen * 2, rayLen * 2)
    for (let y = 0; y < p.h; y++)
      for (let x = 0; x < p.w; x++) {
        const dx = x + 0.5 - rayLen
        const dy = y + 0.5 - rayLen
        const d = Math.hypot(dx, dy)
        if (d < R + 2 || d > rayLen) continue
        const a = (Math.atan2(dy, dx) / TAU) * 12 + f * 0.5
        // Stepped: the wedge narrows in 3 discrete rings instead of a smooth taper.
        const ringK = Math.floor(((d - R) / (rayLen - R)) * 3)
        const half = 0.3 - ringK * 0.07
        if (Math.abs(a - Math.round(a)) < half && 0.62 - ringK * 0.17 > bayer(x, y)) p.set(x, y, rayCol)
      }
    return p.toCanvas()
  })
  sunDisc(skyImg, scx, scy, R, H('#fffbe8', '#fff0a0', '#ffe070', '#fff4c0'))
  const skyC = skyImg.toCanvas()

  const clouds = new WPx(LW, hz)
  {
    const r = rng(12)
    const cp = H('#a4bee6', '#e0ecf8', '#f6faff', '#ffffff')
    for (let x = 60; x < LW; x += 110 + r() * 60)
      cloud(clouds, x, Math.round(hz * (0.25 + r() * 0.3)), 30 + r() * 20, 8 + r() * 4, x, cp)
  }

  const fh = Math.max(14, Math.round(hz * 0.62))
  const far = rolling(LW, fh, H('#7cb8a0', '#90c8a8', '#a2d4b0', '#b8e0bc', '#cceac6'), 61, 140, 0.3, 0.22)
  const mh = Math.max(12, Math.round(hz * 0.44))
  const mid = rolling(LW, mh, H('#3e9a52', '#58b05a', '#72c264', '#90d274', '#b4e48c'), 62, 90, 0.34, 0.24)
  {
    // Lone round trees on the mid hills for scale.
    const r = rng(63)
    const tr = pal.tree
    for (let x = 20; x < LW; x += 50 + r() * 70) {
      let ty = 0
      while (ty < mh - 1 && !mid.get(Math.round(x), ty)) ty++
      const tx = Math.round(x)
      mid.rect(tx, ty - 3, 1, 4, pal.trunk[1])
      mid.ellipse(tx + 0.5, ty - 6, 3.5, 3.5, (xx, yy, nx, ny) => dither(tr, 2.2 - nx - ny * 1.2, xx, yy))
    }
  }
  // Tall-grass fringe along the horizon, three sway frames.
  const gh = Math.max(7, Math.round(hz * 0.12) + 3)
  const fringe = [-1, 0, 1].map((sway) => {
    const p = new WPx(LW, gh)
    const t = pal.tall
    p.rect(0, gh - 2, LW, 2, t[1])
    for (let x = 0; x < LW; x += 2) {
      const bh = Math.round(gh * (0.45 + hash(x, 0, 64) * 0.55))
      const lean = hash(x, 1, 64) < 0.5 ? 0 : 1
      for (let k = 0; k < bh; k++) {
        const f = k / bh
        const dx = Math.round((sway + lean * 0.5) * f * f * 1.6)
        p.set(x + dx, gh - 1 - k, f < 0.3 ? t[1] : f < 0.7 ? t[2] : f < 0.9 ? t[3] : t[4])
      }
    }
    p.outline(t[0])
    return p.toCanvas()
  })

  const haze = hex('#d4ecc0')
  const grounds = [0, 1].map((s) => grassField(g, LW, pal, haze, 71, 0.75, s).toCanvas())
  const flies = [hex('#fff2a0'), hex('#ffb070'), hex('#ffffff')].map((c) =>
    FLY.map((rows) => spr(rows, { a: c, b: hex('#3a2a3a') })),
  )
  const farC = far.toCanvas()
  const midC = mid.toCanvas()
  const cl = clouds.toCanvas()
  const petals = ['#ffb4d4', '#ffffff', '#ffe0ee', '#ffd6f0']

  return {
    draw(ctx, t, camX) {
      ctx.drawImage(skyC, 0, 0)
      ctx.drawImage(rays[Math.floor(t * 1.5) & 1], Math.round(scx - rayLen + camX * 0.03), scy - rayLen)
      tile(ctx, cl, camX * 0.08 + t * 3, 0, W)
      tile(ctx, farC, camX * 0.15, hz - fh + 1, W)
      tile(ctx, midC, camX * 0.3, hz - mh + 1, W)
      tile(ctx, fringe[[0, 1, 2, 1][Math.floor(t * 3) & 3]], camX * 0.18, hz - gh + 2, W)
      drawGround(ctx, grounds[Math.floor(t * 1.4) & 1], g, camX)
      for (let i = 0; i < 3; i++) {
        const bx = Math.round(
          ((hash(i, 0, 5) * W + t * (8 + i * 3) + Math.sin(t * 0.9 + i) * 18) % (W + 20)) - 10 + camX * 0.4,
        )
        const by = Math.round(hz + 4 + hash(i, 1, 5) * (g.foe.feet - hz) + Math.sin(t * 2.3 + i * 2) * 6)
        ctx.drawImage(flies[i][Math.floor(t * 8 + i) & 1], bx, by)
      }
    },
    front(ctx, t, camX) {
      drift(ctx, t, camX, 10, W, 0, g.field, 14, 9, petals)
    },
    pad: grassPad(pal, 7),
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Rug Pull Canyon: hot dusk, layered strata mesas, heat shimmer, drifting dust, cracked mud flats.

export function canyon(g: BackdropGeo): Scene {
  const pal = PALS.canyon
  const { W } = g
  const hz = Math.round(g.horizon)
  const LW = layerW(W)
  const skyP = sky(W, hz, H('#2c1c52', '#4a2462', '#76306a', '#a83e62', '#d2525a', '#ec7650', '#f6a456', '#fbcf7a'), 1)
  const R = Math.round(Math.max(8, Math.min(22, hz * 0.26)))
  sunDisc(skyP, Math.round(W * 0.42), hz - Math.round(R * 0.5), R, H('#fff4c0', '#ffd878', '#ffb454', '#ffc86a'))
  {
    // Thin horizontal cloud streaks cutting the sun: the classic desert-dusk silhouette.
    const r = rng(81)
    const streak = hex('#8a3a6a')
    const lit = hex('#f08a6a')
    for (let i = 0; i < 5; i++) {
      const y = Math.round(hz * (0.3 + r() * 0.45))
      const x = Math.round(r() * W)
      const w = 30 + Math.round(r() * 50)
      skyP.hl(x, y, w, streak)
      skyP.hl(x + 3, y - 1, w - 8, lit)
      skyP.hl(x + 6, y + 1, w - 14, streak)
    }
  }
  const skyC = skyP.toCanvas()

  // Far mesas: flat-topped, washed pink-violet by the dusk haze.
  const fh = Math.max(14, Math.round(hz * 0.52))
  const farM = new WPx(LW, fh)
  const farRamp = H('#7e4476', '#924e7e', '#a86086', '#c07a8e')
  const mesa = (p: WPx, h: number, seed: number, count: number, ramp: readonly Col[], wide: number) => {
    const r = rng(seed)
    const tops = new Float32Array(LW).fill(h)
    const side = new Float32Array(LW)
    for (let k = 0; k < count; k++) {
      const cx = r() * LW
      const w = 12 + r() * wide
      const top = Math.round(h * (0.08 + r() * 0.4))
      const talus = top + (h - top) * (0.55 + r() * 0.2)
      for (let dx = -w / 2 - 40; dx < w / 2 + 40; dx++) {
        // Flat cap, near-vertical cliff, then a gentle talus skirt spreading toward the base.
        const edge = Math.max(0, Math.abs(dx) - w / 2)
        const cliff = top + edge * 6
        const jag = hash(Math.round(cx + dx), k, seed) * 1.5
        const y = Math.round((cliff < talus ? cliff : talus + (edge - (talus - top) / 6) * 0.8) + (edge > 0 ? jag : 0))
        const x = ((Math.round(cx + dx) % LW) + LW) % LW
        if (y < tops[x]) {
          tops[x] = y
          side[x] = dx / (w / 2 + 6)
        }
      }
    }
    for (let x = 0; x < LW; x++) {
      const t = tops[x]
      for (let y = t; y < h; y++) {
        // Lit from the setting sun on the left: faces right of each butte's centre fall into shadow.
        let v = 2 - side[x] * 0.9 - ((y - t) / h) * 0.5
        const sy = y + Math.round(wave(x, LW, 50, seed, 2) * 1.5)
        if (sy % 6 === 0) v -= 0.9
        if (sy % 6 === 1) v += 0.5
        if (y === t) v = 3.6
        p.set(x, y, dither(ramp, v, x, y))
      }
    }
  }
  mesa(farM, fh, 82, 11, farRamp, 22)
  const mh = Math.max(12, Math.round(hz * 0.5))
  const midM = new WPx(LW, mh)
  mesa(midM, mh, 83, 5, pal.cliff, 46)
  midM.outline(pal.cliff[0])
  // Near scrub line: boulders and dead cacti sitting right on the horizon.
  const nh = 12
  const near = new WPx(LW, nh)
  {
    const r = rng(84)
    const rock = pal.rock
    for (let x = 10; x < LW; x += 18 + r() * 40) {
      const bw = 4 + Math.round(r() * 7)
      const bh = 3 + Math.round(r() * 4)
      near.ellipse(x, nh - 1, bw, bh, (xx, yy, nx, ny) => dither(rock, 2.4 - nx * 1.2 - ny * 1.2, xx, yy))
      if (r() < 0.45) {
        const cx = Math.round(x + bw + 4)
        const cac = pal.tree
        near.rect(cx, nh - 10, 2, 10, cac[2])
        near.vl(cx, nh - 10, 10, cac[3])
        near.rect(cx - 3, nh - 6, 3, 1, cac[2])
        near.rect(cx - 3, nh - 9, 1, 3, cac[3])
        near.rect(cx + 2, nh - 5, 2, 1, cac[1])
        near.rect(cx + 3, nh - 8, 1, 3, cac[1])
      }
    }
    near.outline(pal.cliff[0])
  }

  // Cracked mud flats: perspective Voronoi plates with dark cracks, sun-lit upper lips and curled lower edges.
  const gh = g.H - hz
  const ground = new WPx(LW, gh)
  {
    const sand = pal.sand
    const crack = hex('#7a3a26')
    const hazeC = hex('#f0a878')
    const span = g.me.feet - hz
    const { id, e } = plates(LW, gh, span, 44, 85)
    const isCrack = (k: number, y: number) => e[k] < 0.55 + ((y + 2) / span) * 0.5
    for (let y = 0; y < gh; y++) {
      const far = Math.max(0, 1 - y / (gh * 0.3))
      for (let x = 0; x < LW; x++) {
        const k = y * LW + x
        let c: Col
        if (isCrack(k, y)) c = crack
        else if (y > 0 && isCrack(k - LW, y - 1)) c = sand[4]
        else if (y < gh - 1 && isCrack(k + LW, y + 1)) c = sand[1]
        else c = dither(sand, 2.3 + (hash(id[k], 1, 86) - 0.5) * 0.9 - Math.min(1, e[k] / 12) * 0.3, x, y)
        if (far > 0) c = dither([c, mix(c, hazeC, 0.5), hazeC], far * 2.4, x, y)
        ground.put(x, y, c)
      }
    }
    // Pebbles catch the light on the nearer plates.
    const r = rng(88)
    for (let i = 0; i < LW / 6; i++) {
      const px = Math.round(r() * LW)
      const py = Math.round(gh * (0.35 + r() * 0.65))
      const big = py > span * 0.8
      ground.set(px, py, pal.rock[1])
      ground.set(px + 1, py, pal.rock[2])
      if (big) {
        ground.set(px, py - 1, pal.rock[4])
        ground.set(px + 1, py - 1, pal.rock[3])
        ground.set(px + 2, py, pal.rock[1])
      }
    }
  }
  const groundC = ground.toCanvas()
  const farC = farM.toCanvas()
  const midC = midM.toCanvas()
  const nearC = near.toCanvas()
  const puff = new Px(24, 8)
  puff.ellipse(12, 5, 11, 3.5, (x, y, nx, ny) => (1 - nx * nx - ny * ny > bayer(x, y) * 1.4 ? hex('#f6c090', 200) : 0))
  const puffC = puff.toCanvas()
  const dust = ['#f6c898', '#e8a878', '#fff0d0']

  return {
    draw(ctx, t, camX) {
      ctx.drawImage(skyC, 0, 0)
      tile(ctx, farC, camX * 0.12, hz - fh + 1, W)
      // Heat shimmer: the lower rows of the mid mesas waver a pixel in 2-row slices.
      const my = hz - mh + 1
      const ox = camX * 0.25
      const cut = Math.floor(mh * 0.45)
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, W, my + cut)
      ctx.clip()
      tile(ctx, midC, ox, my, W)
      ctx.restore()
      for (let y = cut; y < mh; y += 2) {
        const dx = Math.round(Math.sin(t * 5 + y * 0.9) * ((y - cut) / (mh - cut)) * 1.5)
        const w = midC.width
        const sx = ((Math.round(ox + dx) % w) + w) % w
        for (let x = sx > 0 ? sx - w : 0; x < W; x += w) ctx.drawImage(midC, 0, y, w, 2, x, my + y, w, 2)
      }
      tile(ctx, nearC, camX * 0.4, hz - nh + 2, W)
      drawGround(ctx, groundC, g, camX)
      for (let i = 0; i < 2; i++) {
        const px = Math.round(((t * (10 + i * 6) + i * 170) % (W + 60)) - 30 + camX * 0.4)
        ctx.drawImage(puffC, px, hz + 2 + i * 6)
      }
    },
    front(ctx, t, camX) {
      drift(ctx, t, camX, 14, W, Math.round(g.horizon * 0.5), g.field, 22, 3, dust)
    },
    pad: padCache((rx, ry) => buildPad(rx, ry, sandstone)),
  }
}

const sandstone: PadStyle = {
  top(x, y, _nx, _ny, lit) {
    if (hash(x, y, 93) < 0.05) return PALS.canyon.rock[1]
    return dither(PALS.canyon.rock, 2.2 + lit * 1.6, x, y)
  },
  side(x, k, nx) {
    const r = PALS.canyon.cliff
    const v = (k % 3 === 0 ? 2.8 : 2.1) - Math.max(0, nx) * 1.3 - k * 0.1
    return dither(r, v + (hash(x >> 2, k, 94) - 0.5) * 0.5, x, k)
  },
  rim: hex('#3a1812'),
  edge: PALS.canyon.dirt[4],
  lip: PALS.canyon.rock[4],
  post(p, cx, cy, ax, ay) {
    // A few jagged cracks wandering outward from near the centre, each with a lit lower lip.
    const r = rng(Math.round(ax * 31 + ay))
    const dark = PALS.canyon.cliff[1]
    const lit = PALS.canyon.dirt[4]
    for (let k = 0; k < 4; k++) {
      let x = cx + (r() - 0.5) * ax * 0.6
      let y = cy + (r() - 0.5) * ay * 0.6
      const a = r() * TAU
      const dx = Math.cos(a)
      const dy = Math.sin(a) * 0.45
      for (let s = 0; s < ax * 0.8; s++) {
        const nx = (x - cx) / ax
        const ny = (y - cy) / ay
        if (nx * nx + ny * ny > 0.8) break
        p.put(Math.floor(x), Math.floor(y), dark)
        if (p.get(Math.floor(x), Math.floor(y) + 1) !== dark) p.put(Math.floor(x), Math.floor(y) + 1, lit)
        x += dx + (r() - 0.5) * 0.8
        y += dy + (r() - 0.5) * 0.8
      }
    }
  },
}
