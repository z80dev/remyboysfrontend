import { type Col, Px, hash, hex, mix, rng, shade } from '../../gfx/px'
/** Interior battle backdrops: THE FLOOR gallery and Rug Tower, the final dungeon. */
import type { BackdropGeo } from '../backdrops'
import {
  type PadStyle,
  type Scene,
  TAU,
  WPx,
  band,
  bayer,
  bond,
  buildPad,
  dither,
  drawGround,
  layerW,
  padCache,
  plates,
  tile,
} from './kit'

const H = (...s: string[]) => s.map((c) => hex(c))

// ---------------------------------------------------------------------------------------------------------------
// THE FLOOR: warm museum wall with framed pixel paintings under spotlight cones, polished plank floor mirroring them.

const GOLD = H('#3a2410', '#8a5a1a', '#c8902a', '#f0c850', '#fff0a0')

/** Paints one small abstract artwork into `p` at (x, y), w×h. Styles cycle so neighbours never repeat. */
function artwork(p: Px, x: number, y: number, w: number, h: number, kind: number, seed: number): void {
  const r = rng(seed)
  const at = (i: number, j: number, c: Col) => p.set(x + i, y + j, c)
  if (kind === 0 || kind === 4) {
    // Remy silhouette portrait: flat colour block, big round head, shoulders, two bright eyes.
    const bg = kind === 0 ? H('#0036b0', '#0052ff', '#3d7eff') : H('#6a1a3a', '#a02a4a', '#d0506a')
    const fig = kind === 0 ? hex('#101838') : hex('#2a0a18')
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) at(i, j, dither(bg, 2 - j / h + (i / w) * 0.4, x + i, y + j))
    const cx = w / 2
    const hr = Math.max(3, Math.round(Math.min(w, h) * 0.26))
    const hy = Math.round(h * 0.42)
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const dx = i + 0.5 - cx
        const inHead = dx * dx + (j + 0.5 - hy) ** 2 < hr * hr
        const inBody = j > hy + hr - 2 && Math.abs(dx) < hr * 1.2 + (j - hy - hr) * 0.9
        if (inHead || inBody) at(i, j, fig)
      }
    if (kind === 4) for (let i = -1; i <= 1; i++) at(Math.round(cx + i), hy - hr, fig)
    const ey = hy - 1
    at(Math.round(cx - hr * 0.45), ey, hex('#ffffff'))
    at(Math.round(cx + hr * 0.35), ey, hex('#ffffff'))
    at(Math.round(cx - 1), ey + 2, kind === 0 ? hex('#3d7eff') : hex('#ff8a9a'))
    at(Math.round(cx), ey + 2, kind === 0 ? hex('#3d7eff') : hex('#ff8a9a'))
  } else if (kind === 1) {
    // Colour-field: two stacked blocks with soft dithered edges.
    const a = H('#5a1a2a', '#c8402a', '#f08040')
    const b = H('#1a2a4a', '#2a5a8a', '#7ab0d0')
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const top = j < h * 0.55
        const edge = Math.min(i, w - 1 - i, top ? j : h - 1 - j, Math.abs(j - h * 0.55)) / 3
        at(i, j, dither(top ? a : b, Math.min(2, 0.6 + edge), x + i, y + j))
      }
  } else if (kind === 2) {
    // Grid composition in primaries.
    const cols = H('#f4efe2', '#d42a2a', '#1a4ab0', '#f0c020', '#f4efe2', '#f4efe2')
    const xs = [0, Math.round(w * 0.35), Math.round(w * 0.7), w]
    const ys = [0, Math.round(h * 0.45), h]
    for (let a = 0; a < 3; a++)
      for (let b = 0; b < 2; b++) {
        const c = cols[Math.floor(r() * cols.length)]
        for (let j = ys[b]; j < ys[b + 1]; j++) for (let i = xs[a]; i < xs[a + 1]; i++) at(i, j, c)
      }
    for (const gx of xs.slice(1, -1)) for (let j = 0; j < h; j++) at(gx, j, hex('#141414'))
    for (const gy of ys.slice(1, -1)) for (let i = 0; i < w; i++) at(i, gy, hex('#141414'))
  } else {
    // Tiny landscape: gradient sky, sun, rolling hill, candle on the horizon.
    const skyR = H('#f08a5a', '#f8c070', '#fce8a8')
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) at(i, j, dither(skyR, (j / h) * 2.4, x + i, y + j))
    for (let i = 0; i < w; i++) {
      const hy = Math.round(h * 0.62 + Math.sin(i * 0.35 + seed) * 2)
      for (let j = hy; j < h; j++) at(i, j, j === hy ? hex('#6aa84a') : hex('#3a6a3a'))
    }
    const sx = Math.round(w * 0.7)
    for (let j = -2; j <= 2; j++)
      for (let i = -2; i <= 2; i++) if (i * i + j * j <= 5) at(sx + i, Math.round(h * 0.3) + j, hex('#fff6d0'))
  }
}

export function gallery(g: BackdropGeo): Scene {
  const { W } = g
  const hz = Math.round(g.horizon)
  const LW = layerW(W)
  const wallR = H('#6a4e48', '#8a6a5a', '#a8866c', '#c8a684', '#dcc09a', '#ecd6b0')
  const wood = H('#2a160e', '#4a2a1c', '#6a3e26', '#8a5432', '#a86c42', '#c88a58')
  const wh = Math.round(hz * 0.2) + 3
  const crown = 4
  const artTop = crown + 4
  const ah = hz - wh - artTop - 3
  const ph = Math.max(10, Math.min(40, ah - 3))
  const pitch = Math.round(ph * 2.2 + 16)
  const n = Math.max(2, Math.round(LW / pitch))
  const LWg = Math.round(LW / n) * n
  const step = LWg / n

  const wall = new WPx(LWg, hz)
  // Plaster darkening toward the ceiling, then the spotlight cones lift it back toward cream.
  const cones: [number, number][] = []
  for (let k = 0; k < n; k++) cones.push([Math.round(k * step + step / 2), Math.round(ph * (0.9 + (k % 3) * 0.3))])
  for (let y = 0; y < hz; y++)
    for (let x = 0; x < LWg; x++) {
      let v = 1.4 + (y / hz) * 1.6
      for (const [cx, pw] of cones) {
        let dx = Math.abs(x - cx)
        dx = Math.min(dx, LWg - dx)
        const half = 3 + ((y - crown) / (hz - crown)) * pw * 1.5
        if (y > crown && dx < half) v += 1.8 * (1 - dx / half) ** 0.5 * (1 - (y / hz) * 0.4)
      }
      wall.d[y * LWg + x] = band(wallR, v, x, y, 0.5)
    }
  // Crown molding, wainscot panels, baseboard.
  wall.hl(0, 0, LWg, wood[0])
  wall.hl(0, 1, LWg, wood[3])
  wall.hl(0, 2, LWg, wood[4])
  wall.hl(0, 3, LWg, wood[1])
  const wy = hz - wh
  wall.rect(0, wy, LWg, wh, wood[2])
  wall.hl(0, wy - 1, LWg, wood[1])
  wall.hl(0, wy, LWg, wood[5])
  wall.hl(0, wy + 1, LWg, wood[4])
  for (let x = 4; x < LWg; x += 26) {
    wall.rect(x, wy + 4, 20, wh - 7, wood[1])
    wall.rect(x + 1, wy + 5, 18, wh - 8, wood[3])
    wall.rect(x + 1, wy + 5, 18, 1, wood[1])
    wall.rect(x + 1, wy + 5, 1, wh - 8, wood[1])
  }
  wall.rect(0, hz - 2, LWg, 2, wood[0])
  // Paintings, each with a spotlight fixture above and a brass plaque below.
  for (let k = 0; k < n; k++) {
    const [cx, pw] = cones[k]
    const w = pw
    const h = ph - (k % 2) * Math.round(ph * 0.15)
    const x0 = cx - (w >> 1)
    const y0 = artTop + Math.round((ah - h) / 2)
    wall.rect(x0 - 3, y0 - 3, w + 6, h + 6, GOLD[0])
    for (let j = -2; j < h + 2; j++)
      for (let i = -2; i < w + 2; i++) {
        const ring = Math.min(i + 2, j + 2, w + 1 - i, h + 1 - j)
        if (ring > 1) continue
        const lit = i + j < w * 0.4 + h * 0.4 ? 1 : 0
        wall.set(x0 + i, y0 + j, ring === 0 ? GOLD[2 + lit] : GOLD[1 + lit * 2])
      }
    artwork(wall, x0, y0, w, h, k % 5, 122 + k)
    // Drop shadow to the lower-right of the frame.
    wall.vl(x0 + w + 3, y0 - 1, h + 5, shade(wallR[2], -0.35))
    wall.hl(x0 - 1, y0 + h + 3, w + 5, shade(wallR[2], -0.35))
    wall.rect(cx - 2, y0 + h + 5, 5, 2, GOLD[3])
    wall.hl(cx - 2, y0 + h + 6, 5, GOLD[1])
    wall.rect(cx - 2, crown, 5, 2, wood[0])
    wall.hl(cx - 1, crown + 2, 3, hex('#fff6d0'))
  }
  const wallC = wall.toCanvas()

  // Polished planks mirroring the wall: the reflection is flipped, darkened and broken up by ordered dither.
  const gh = g.H - hz
  const refl = Math.round(Math.min(gh * 0.55, hz * 0.9))
  const floor = bond(g, LWg, 0.24, 6, (x, y, c) => {
    let col: Col
    if (c.seam === 1) col = wood[0]
    else if (c.seam === 2) col = wood[1]
    else col = dither(wood, 2.6 + (hash(c.cell, c.ri, 123) - 0.5) * 0.9 - c.k * 0.5 + (c.k < 0.3 ? 0.4 : 0), x, y)
    if (y < refl) {
      // Mirror image, stepped weaker with distance; plain plaster is skipped so only art and trim reflect.
      const src = wall.get(x, hz - 3 - y)
      const a = y < refl * 0.4 ? 0.3 : 0.16
      if (src && !wallR.includes(src)) col = mix(col, src, a)
    }
    return col
  }).toCanvas()

  // Brass stanchions with a sagging velvet rope, a step in front of the wall.
  const sh = 14
  const rope = new WPx(LWg, sh)
  {
    const velvet = H('#3a0a14', '#7a1a28', '#b02a3a', '#e05a64')
    const posts = Math.max(2, Math.round(LWg / 70))
    const ps = LWg / posts
    for (let k = 0; k < posts; k++) {
      const px = Math.round(k * ps + ps * 0.25)
      for (let i = 0; i < ps; i++) {
        const sag = Math.sin((i / ps) * Math.PI) * 5
        const y = Math.round(4 + sag)
        rope.set(px + i, y, velvet[2])
        rope.set(px + i, y + 1, velvet[1])
        if (i % 3 === 0) rope.set(px + i, y, velvet[3])
      }
      rope.rect(px - 1, 2, 3, sh - 4, GOLD[2])
      rope.vl(px - 1, 2, sh - 4, GOLD[4])
      rope.vl(px + 1, 2, sh - 4, GOLD[1])
      rope.rect(px - 1, 0, 3, 2, GOLD[3])
      rope.rect(px - 2, sh - 2, 5, 2, GOLD[1])
      rope.hl(px - 2, sh - 2, 5, GOLD[3])
    }
    rope.outline(GOLD[0])
  }
  const ropeC = rope.toCanvas()

  return {
    draw(ctx, t, camX) {
      const ox = camX * 0.15
      tile(ctx, wallC, ox, 0, W)
      drawGround(ctx, floor, g, camX)
      tile(ctx, ropeC, camX * 0.3, hz - sh + 5, W)
      // Dust motes turning slowly inside each light cone.
      const o = Math.round(ox)
      for (let k = 0; k < n; k++) {
        const [cx, pw] = cones[k]
        for (let i = 0; i < 4; i++) {
          const f = (t * (0.05 + hash(k, i, 124) * 0.05) + hash(k, i, 125)) % 1
          const y = Math.round(crown + 4 + f * (hz - crown - 8))
          const half = ((y - crown) / (hz - crown)) * pw * 0.7
          const x = Math.round(cx + Math.sin(t * 0.7 + i * 2 + k) * half)
          const sx = (((x + o) % LWg) + LWg) % LWg
          ctx.fillStyle = (Math.floor(t * 3 + i) & 1) === 0 ? '#fff6d0' : '#e8cfa0'
          for (let xx = sx - LWg; xx < W; xx += LWg) ctx.fillRect(xx, y, 1, 1)
        }
      }
    },
    pad: padCache((rx, ry) => buildPad(rx, ry, marble)),
  }
}

const MARBLE = H('#7a6c6a', '#b0a29a', '#d8ccc2', '#eee4d8', '#fffaf0')
const marble: PadStyle = {
  top(x, y, nx, ny, lit) {
    // Wandering grey veins from summed sines; the gold inlay ring marks the plinth's edge.
    const r = Math.sqrt(nx * nx + ny * ny)
    if (r > 0.84 && r < 0.9) return GOLD[3]
    const vein = Math.abs(Math.sin(x * 0.21 + Math.sin(y * 0.5 + x * 0.05) * 2.5 + y * 0.3))
    if (vein < 0.09) return MARBLE[1]
    if (vein < 0.18 && (x + y) % 2 === 0) return MARBLE[2]
    return band(MARBLE, 2.6 + lit * 1.4, x, y, 0.5)
  },
  side(x, k, nx) {
    if (k === 1) return GOLD[Math.max(1, 3 - Math.round(Math.max(0, nx) * 2))]
    return dither(MARBLE, 2.4 - k * 0.2 - Math.max(0, nx) * 1.5, x, k)
  },
  rim: hex('#2a2432'),
  edge: MARBLE[4],
  lip: MARBLE[1],
}

// ---------------------------------------------------------------------------------------------------------------
// Rug Tower: a void with a palette-cycled vortex, a huge red candle chart crashing down, tattered hanging rugs,
// obsidian floor split by glowing cracks, embers and lightning.

const RUG = {
  red: H('#3a0610', '#6a0e1c', '#9a1a2a', '#c8323a'),
  gold: H('#5a3a10', '#a8781e', '#e0b040'),
  navy: H('#0a0e24', '#1a2250', '#2a3a78'),
}

/** One tattered rug with border, lozenge medallion, moth holes and a ragged fringed hem. */
function rugPx(w: number, h: number, seed: number): Px {
  const p = new Px(w, h + 3)
  const r = rng(seed)
  const hem = Array.from({ length: w }, () => h - Math.round(r() * h * 0.22))
  for (let x = 0; x < w; x++)
    for (let y = 0; y < hem[x]; y++) {
      const bx = Math.min(x, w - 1 - x)
      const by = Math.min(y, h - 1 - y)
      const b = Math.min(bx, by)
      let c: Col
      if (b < 1) c = RUG.red[0]
      else if (b < 3) c = (x + y) % 4 < 2 ? RUG.gold[1] : RUG.red[2]
      else if (b < 4) c = RUG.gold[2]
      else {
        const cx = Math.abs(x + 0.5 - w / 2) / (w / 2 - 4)
        const cy = Math.abs(y + 0.5 - h * 0.45) / (h * 0.3)
        const d = cx + cy
        c =
          d < 0.45
            ? d < 0.2
              ? RUG.gold[2]
              : RUG.red[3]
            : d < 0.6
              ? RUG.gold[1]
              : dither(RUG.navy, 1.4 + ((x + y) % 6 === 0 ? 1 : 0), x, y)
      }
      // Hanging cloth darkens toward its folds on the right.
      p.set(x, y, x > w * 0.7 && (x + y) % 2 === 0 ? shade(c, -0.25) : c)
    }
  for (let k = 0; k < 3; k++) {
    const hx = Math.round(3 + r() * (w - 6))
    const hy = Math.round(h * (0.3 + r() * 0.5))
    const hr = 1 + r() * 1.5
    for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= hr * hr) p.put(hx + x, hy + y, 0)
  }
  for (let x = 1; x < w - 1; x += 2) if (r() < 0.7) p.vl(x, hem[x], 2 + Math.round(r()), RUG.gold[1])
  p.outline(hex('#07040c'))
  return p
}

export function tower(g: BackdropGeo, boss: boolean): Scene {
  const { W } = g
  const hz = Math.round(g.horizon)
  const LW = layerW(W)
  const voidR = boss
    ? H('#050208', '#0c0410', '#18061a', '#2a0a22', '#4a0e26', '#7a1428', '#c02a2a', '#ff6a3a')
    : H('#07040e', '#0e0818', '#1a0c2a', '#2a1040', '#44144c', '#6a1a50', '#a0244a', '#e04a4a')
  const vcx = W * 0.52
  const vcy = hz * 0.4
  const vR = Math.max(W * 0.55, hz * 1.3)
  const FR = 6
  // Palette-cycled vortex: one spiral field, phase-shifted per frame, so it turns without per-pixel work at runtime.
  const vortex = Array.from({ length: FR }, (_, f) => {
    const p = new Px(W, hz)
    for (let y = 0; y < hz; y++)
      for (let x = 0; x < W; x++) {
        const dx = x + 0.5 - vcx
        const dy = (y + 0.5 - vcy) * 1.8
        const r = Math.hypot(dx, dy)
        const a = Math.atan2(dy, dx)
        const s = (a / TAU) * 3 + Math.log(r + 2) * 1.6 - f / FR
        const arm = 0.5 + 0.5 * Math.cos((s - Math.floor(s)) * TAU)
        const fall = Math.max(0, 1 - r / vR)
        const v = 0.6 + (y / hz) * 0.8 + fall ** 1.4 * (boss ? 5.4 : 4.4) * (0.35 + 0.65 * arm)
        p.d[y * W + x] = dither(voidR, v, x, y)
      }
    return p.toCanvas()
  })

  // The crash: a staircase of huge red candles falling left → right, glowing against the void.
  const ch = Math.max(20, Math.round(hz * 0.95))
  const chart = new Px(W, ch)
  const cw = Math.max(8, Math.round(W / 26))
  const candles: [number, number, number][] = []
  {
    const n = 4
    let level = ch * 0.04
    for (let i = 0; i < n; i++) {
      const x = Math.round(W * 0.08 + (i / (n - 1)) * W * 0.8)
      const drop = ch * (0.22 + hash(i, 0, 131) * 0.06)
      const top = Math.round(level - (i === 0 ? 0 : ch * 0.03))
      const bot = Math.round(level + drop)
      candles.push([x, top, bot])
      level = bot - ch * 0.02
    }
    const glow = hex('#5a0a1a')
    for (const [x, top, bot] of candles)
      for (let y = top - 4; y < bot + 6; y++)
        for (let dx = -4; dx < cw + 4; dx++) {
          const d = Math.max(0, -dx, dx - cw + 1, top - y, y - bot)
          if (d > 0 && d < 4 && (1 - d / 4) * 0.7 > bayer(x + dx, y)) chart.set(x + dx, y, glow)
        }
    for (const [x, top, bot] of candles) {
      const mid = x + (cw >> 1)
      chart.vl(mid, top - 4, bot - top + 9, hex('#ff5a4a'))
      chart.rect(x, top, cw, bot - top, hex('#c81e2e'))
      chart.vl(x, top, bot - top, hex('#ff6a5a'))
      chart.vl(x + cw - 1, top, bot - top, hex('#7a0e1c'))
      chart.hl(x, bot - 1, cw, hex('#7a0e1c'))
    }
    chart.outline(hex('#1a0208'))
  }
  const chartC = chart.toCanvas()
  const lastC = candles[candles.length - 1]

  // Tattered rugs on rods between the candles, each with four sway frames (rows shear more the lower they hang).
  const rugs = [0.215, 0.48, 0.745].map((fx, i) => {
    const w = Math.round(16 + hash(i, 0, 132) * 8)
    const h = Math.round(hz * (0.5 + hash(i, 1, 132) * 0.3))
    const base = rugPx(w, h, 133 + i)
    const frames = [0, 1, 2, 3].map((f) => {
      const q = new Px(w + 6, base.h + 3)
      const ph = Math.sin((f / 4) * TAU)
      for (let y = 0; y < base.h; y++) {
        const dx = Math.round(3 + ph * 2.2 * (y / base.h) ** 1.5)
        for (let x = 0; x < w; x++) {
          const c = base.d[y * w + x]
          if (c) q.set(x + dx, y + 3, c)
        }
      }
      q.rect(0, 1, w + 6, 2, hex('#2a1a24'))
      q.hl(0, 1, w + 6, hex('#5a4a5a'))
      q.rect(0, 0, 2, 4, RUG.gold[2])
      q.rect(w + 4, 0, 2, 4, RUG.gold[2])
      return q.toCanvas()
    })
    return { x: Math.round(W * fx - w / 2), frames, phase: i * 1.3 }
  })

  // Broken pillars on the far rim of the floor, rim-lit red by the chart.
  const pH = Math.max(14, Math.round(hz * 0.45))
  const pillars = new WPx(LW, pH)
  {
    const stone = H('#0c0814', '#161020', '#221830', '#30223e')
    const r = rng(134)
    for (let x = 12; x < LW; x += 40 + r() * 50) {
      const pw = 6 + Math.round(r() * 4)
      const top = Math.round(pH * (0.1 + r() * 0.5))
      for (let i = 0; i < pw; i++) {
        const broken = top + Math.round(Math.abs(Math.sin(i * 1.7 + x)) * 3)
        for (let y = broken; y < pH; y++) {
          const fl = i % 3 === 1 ? -0.6 : 0
          pillars.set(
            Math.round(x) + i,
            y,
            i === pw - 1 ? hex('#8a2030') : dither(stone, 2 + fl - (i / pw) * 1.2, x + i, y),
          )
        }
      }
      pillars.rect(Math.round(x) - 1, pH - 3, pw + 2, 3, stone[2])
      pillars.hl(Math.round(x) - 1, pH - 3, pw + 2, stone[3])
    }
    pillars.outline(hex('#040208'))
  }
  const pillarsC = pillars.toCanvas()

  // Obsidian plates split by glowing cracks; fog rolls in at the horizon.
  const gh = g.H - hz
  const span = g.me.feet - hz
  const floor = new WPx(LW, gh)
  {
    const obs = H('#07040c', '#100a1a', '#1a1028', '#261838', '#3a2650')
    const fog = hex(boss ? '#3a0a1e' : '#2a1440')
    const { id, e } = plates(LW, gh, span, 40, 135)
    for (let y = 0; y < gh; y++) {
      const s = (y + 2) / span
      const hot = hex(s > 0.6 ? '#ff5a2a' : s > 0.35 ? '#d0302a' : '#7a1626')
      const far = Math.max(0, 1 - y / (gh * 0.42))
      for (let x = 0; x < LW; x++) {
        const k = y * LW + x
        const w = 0.5 + s * 0.4
        let c: Col
        // Far plates are only a few pixels across: show them as dim seams, not a lattice of sparks.
        if (e[k] < w && s > 0.22) c = hot
        else if (e[k] < w + 1.2 && s > 0.35) c = hex('#5a1420')
        else if (y > 0 && s > 0.25 && e[k - LW] < 0.5 + ((y + 1) / span) * 0.4) c = obs[4]
        else
          c = dither(
            obs,
            1.8 + (hash(id[k], 2, 136) - 0.5) * (s > 0.25 ? 1.2 : 0.4) + (1 - Math.min(1, e[k] / 10)) * 0.6,
            x,
            y,
          )
        if (far > 0) c = band([c, mix(c, fog, 0.6), fog], far * 2.4, x, y, 0.4)
        floor.put(x, y, c)
      }
    }
  }
  const floorC = floor.toCanvas()

  // Lightning bolts: jagged random walks with a branch, three variants.
  const bolts = [0, 1, 2].map((k) => {
    const bw = 40
    const p = new Px(bw, hz)
    const r = rng(137 + k)
    const walk = (x0: number, y0: number, len: number) => {
      let x = x0
      for (let y = y0; y < Math.min(hz, y0 + len); y++) {
        x += Math.round((r() - 0.5) * 3)
        p.set(x, y, hex('#fff6ff'))
        p.set(x + 1, y, hex('#b89aff'))
        p.set(x - 1, y, hex('#6a4aff', 160))
        if (r() < 0.04 && y < hz * 0.6) walk(x, y, Math.round(len * 0.35))
      }
    }
    walk(bw >> 1, 0, Math.round(hz * 0.85))
    return p.toCanvas()
  })
  const period = boss ? 2.8 : 5.5

  const ember = ['#ff9a3a', '#ff5a2a', '#ffd06a']

  return {
    draw(ctx, t, camX) {
      ctx.drawImage(vortex[Math.floor(t * (boss ? 9 : 6)) % FR], 0, 0)
      const cx = Math.round(camX * 0.08)
      ctx.drawImage(chartC, cx, hz - ch)
      // The newest candle keeps bleeding lower.
      const [lx, , lb] = lastC
      const ext = Math.round(2 + Math.abs(Math.sin(t * 1.3)) * 5)
      ctx.fillStyle = '#c81e2e'
      ctx.fillRect(lx + cx, hz - ch + lb, cw, ext)
      ctx.fillStyle = '#ff5a4a'
      ctx.fillRect(lx + cx + (cw >> 1), hz - ch + lb + ext, 1, 3)
      const ph = t % period
      if (ph < 0.09 || (ph > 0.18 && ph < 0.24)) {
        const b = bolts[Math.floor(t / period) % bolts.length]
        const bx = Math.round(hash(Math.floor(t / period), 0, 138) * (W - 40))
        ctx.fillStyle = boss ? 'rgba(255,190,200,0.22)' : 'rgba(210,190,255,0.18)'
        ctx.fillRect(0, 0, W, g.H)
        ctx.drawImage(b, bx, 0)
      }
      tile(ctx, pillarsC, camX * 0.25, hz - pH + 2, W)
      for (const rug of rugs) {
        const f = Math.floor(((Math.sin(t * 1.1 + rug.phase) + 1) / 2) * 3.99)
        ctx.drawImage(rug.frames[f], Math.round(rug.x + camX * 0.12), 0)
      }
      drawGround(ctx, floorC, g, camX)
      for (let i = 0; i < 18; i++) {
        const f = (t * (0.08 + hash(i, 0, 139) * 0.08) + hash(i, 1, 139)) % 1
        const y = Math.round(g.field - f * (g.field + 10))
        const x = Math.round((((hash(i, 2, 139) * W + Math.sin(t * 1.5 + i) * 8 + camX * 0.5) % W) + W) % W)
        ctx.fillStyle = ember[i % 3]
        ctx.fillRect(x, y, 1, (Math.floor(t * 6 + i) & 1) + 1)
      }
    },
    front(ctx, t, camX) {
      for (let i = 0; i < 6; i++) {
        const f = (t * (0.12 + hash(i, 0, 140) * 0.1) + hash(i, 1, 140)) % 1
        const y = Math.round(g.field - f * g.field)
        const x = Math.round((((hash(i, 2, 140) * W + Math.sin(t + i) * 12 + camX) % W) + W) % W)
        ctx.fillStyle = ember[i % 3]
        ctx.fillRect(x, y, 2, 1)
      }
    },
    pad: padCache((rx, ry) => buildPad(rx, ry, dais)),
  }
}

const OBS = H('#07040c', '#140c20', '#221634', '#342450', '#4a3670')
const dais: PadStyle = {
  top(x, y, nx, ny, lit) {
    // Rug-woven obsidian: a lozenge lattice in dim red over black glass, glowing ring near the rim.
    const r = Math.sqrt(nx * nx + ny * ny)
    if (r > 0.82) return (x + y) % 2 ? hex('#ff4a2a') : hex('#c01e2a')
    if (r > 0.76) return OBS[0]
    const u = Math.abs(((nx * 6 + ny * 12) % 2) + 2) % 2
    const v = Math.abs(((nx * 6 - ny * 12) % 2) + 2) % 2
    if (Math.abs(u - 1) < 0.12 || Math.abs(v - 1) < 0.12) return hex('#6a0e1c')
    if (r < 0.14) return RUG.gold[2]
    return dither(OBS, 1.8 + lit * 1.6, x, y)
  },
  side(x, k, nx) {
    if ((x * 7 + k * 3) % 17 === 0) return hex('#ff5a2a')
    return dither(OBS, 2 - k * 0.25 - Math.max(0, nx) * 1.2, x, k)
  },
  rim: hex('#ff3a2a'),
  edge: OBS[4],
  lip: hex('#8a1a2a'),
}
