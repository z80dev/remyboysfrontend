/**
 * Battle FX sprites, drawn once into tiny canvases with the Px toolkit and cached. Every factory is deterministic
 * for its arguments, so FX code can call them per spawn without allocating after the first use.
 */
import { type Col, Px, canvas, ctx2d, hex, mix, ramp, rng, shade, text, textWidth } from '../gfx/px'

const cache = new Map<string, HTMLCanvasElement | HTMLCanvasElement[]>()
function memo<T extends HTMLCanvasElement | HTMLCanvasElement[]>(key: string, make: () => T): T {
  let hit = cache.get(key) as T | undefined
  if (!hit) {
    hit = make()
    cache.set(key, hit)
  }
  return hit
}

export const INK = hex('#1a1222')
const WHITE = hex('#ffffff')
const CREAM = hex('#fff6d0')

export const GREEN = [hex('#0d3d24'), hex('#16753c'), hex('#27c46b'), hex('#6fe39a'), hex('#c8ffd8')]
export const RED = [hex('#4a0a18'), hex('#9a1e34'), hex('#ec4a4a'), hex('#ff8f8f'), hex('#ffd6d6')]
export const BLUE = [hex('#0a2a66'), hex('#1650c8'), hex('#2f8cff'), hex('#8cc8ff'), hex('#e6f6ff')]
export const PURPLE = [hex('#2a0f4a'), hex('#6a2cae'), hex('#b35cff'), hex('#d9a6ff'), hex('#f6e6ff')]
export const GOLD = [hex('#4a2c00'), hex('#a86d00'), hex('#e0a100'), hex('#ffd34d'), hex('#fff3b0')]

/** Candle stick: body `w`×`h` plus 1px wick above and below, outlined. Up = green, down = red. */
export function candle(h: number, up: boolean, w = 5): HTMLCanvasElement {
  return memo(`candle${h},${up},${w}`, () => {
    const r = up ? GREEN : RED
    const wick = Math.max(2, Math.round(h * 0.25))
    const p = new Px(w + 2, h + wick * 2 + 2)
    const cx = (w + 2) >> 1
    p.vl(cx, 1, wick, r[1])
    p.vl(cx, 1 + wick + h, wick, r[1])
    p.rect(1, 1 + wick, w, h, r[2])
    p.vl(1, 1 + wick, h, r[3])
    p.vl(w, 1 + wick, h, r[1])
    p.hl(1, 1 + wick, w, r[4])
    if (w >= 7) {
      // Big candles get a glossy highlight stripe and a dithered core shadow so they read as solid volumes.
      p.vl(2, 2 + wick, h - 2, r[4])
      p.vl(3, 2 + wick, h - 2, r[3])
      for (let y = 0; y < h; y++)
        for (let x = Math.ceil(w * 0.62); x < w; x++) if ((x + y) % 2 === 0 || x >= w - 1) p.set(x, 1 + wick + y, r[1])
      p.hl(1, wick + h, w, r[1])
    }
    p.outline(INK)
    return p.toCanvas()
  })
}

/** Chunky chevron (▲/▼) `w` px wide, 2px thick, outlined. */
export function chevron(up: boolean, w: number, col: Col[]): HTMLCanvasElement {
  return memo(`chev${up},${w},${col[2]}`, () => {
    const half = w >> 1
    const p = new Px(w + 2, half + 5)
    for (let i = 0; i <= half; i++) {
      const y = up ? 1 + i : 1 + half - i
      for (const x of [1 + half - i, 1 + half + i]) {
        p.set(x, y, col[3])
        p.set(x, y + 1, col[2])
        p.set(x, y + 2, col[1])
      }
    }
    p.outline(INK)
    return p.toCanvas()
  })
}

/** Impact star: 3 frames (spark → spiky burst → broken ring), `r` px radius, tinted by `base`. */
export function impact(r: number, base: Col): HTMLCanvasElement[] {
  return memo(`hit${r},${base}`, () => {
    const rp = ramp(base)
    const s = r * 2 + 3
    const c = r + 1.5
    const frames: HTMLCanvasElement[] = []
    for (let f = 0; f < 3; f++) {
      const p = new Px(s, s)
      const rays = 8
      const reach = [0.55, 1, 1][f] * r
      const inner = [0, 0.25, 0.7][f] * r
      for (let k = 0; k < rays; k++) {
        const a = (k / rays) * Math.PI * 2 + (f === 2 ? 0.2 : 0)
        const len = k % 2 ? reach * 0.62 : reach
        for (let d = inner; d <= len; d += 0.5) {
          const x = Math.round(c + Math.cos(a) * d - 0.5)
          const y = Math.round(c + Math.sin(a) * d - 0.5)
          const col = d < len * 0.45 ? WHITE : d < len * 0.8 ? rp[4] : rp[3]
          p.set(x, y, col)
          if (k % 2 === 0 && d < len * 0.7) {
            p.set(x + 1, y, col)
            p.set(x, y + 1, col)
          }
        }
      }
      if (f < 2) p.ellipse(c, c, r * (f ? 0.32 : 0.28), r * (f ? 0.32 : 0.28), f ? WHITE : rp[4])
      p.outline(rp[0])
      frames.push(p.toCanvas())
    }
    return frames
  })
}

/** 1px circle outline with a second inner tone — shockwaves and ripples. `squash` < 1 flattens it onto the ground. */
export function ring(r: number, col: Col, squash = 1): HTMLCanvasElement {
  return memo(`ring${r},${col},${squash}`, () => {
    const w = r * 2 + 2
    const h = Math.max(3, Math.round(r * squash) * 2 + 2)
    const p = new Px(w, h)
    const ry = (h - 2) / 2
    p.each((x, y) => {
      const nx = (x + 0.5 - w / 2) / r
      const ny = (y + 0.5 - h / 2) / ry
      const d = Math.sqrt(nx * nx + ny * ny)
      if (d <= 1 && d > 1 - 1.4 / r) return col
      if (d <= 1 - 1.4 / r && d > 1 - 2.6 / r) return shade(col, 0.5)
      return 0
    })
    return p.toCanvas()
  })
}

/** Twinkle star, 4 frames growing from a dot to a full 4-point cross with diagonals. */
export function twinkle(col: Col = hex('#ffe066')): HTMLCanvasElement[] {
  return memo(`tw${col}`, () =>
    [0, 1, 2, 3].map((f) => {
      const p = new Px(9, 9)
      const arm = [0, 2, 3, 4][f]
      for (let i = -arm; i <= arm; i++) {
        const c = Math.abs(i) <= 1 ? WHITE : col
        p.set(4 + i, 4, c)
        p.set(4, 4 + i, c)
      }
      if (f >= 2)
        for (const [dx, dy] of [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ])
          p.set(4 + dx, 4 + dy, col)
      p.set(4, 4, WHITE)
      return p.toCanvas()
    }),
  )
}

/** Chunky 5-point star (catch success), shaded gold with a bright upper-left. */
export function star(): HTMLCanvasElement {
  return memo('star', () => {
    const rows = [
      '.....4.....',
      '....443....',
      '....432....',
      '44443322222',
      '.443332221.',
      '..4332221..',
      '..3322211..',
      '.3322.2211.',
      '.322...211.',
      '321.....11.',
    ]
    const p = new Px(13, 12)
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] !== '.') p.set(1 + i, 1 + j, GOLD[Number(row[i])])
    })
    p.outline(GOLD[0])
    return p.toCanvas()
  })
}

/** Spinning coin: 4 frames (face, narrow, edge, narrow). */
export function coin(): HTMLCanvasElement[] {
  return memo('coin', () =>
    [7, 5, 2, 5].map((w) => {
      const p = new Px(9, 9)
      p.ellipse(4.5, 4.5, w / 2, 3.5, (x) => (x < 4 ? GOLD[4] : x > 5 ? GOLD[2] : GOLD[3]))
      if (w >= 5) p.vl(4, 3, 3, GOLD[1])
      p.outline(GOLD[0])
      return p.toCanvas()
    }),
  )
}

/** Water droplet. */
export function drop(): HTMLCanvasElement {
  return memo('drop', () => {
    const p = new Px(5, 7)
    p.set(2, 1, BLUE[3])
    p.hl(1, 2, 3, BLUE[2])
    p.rect(1, 3, 3, 2, BLUE[2])
    p.set(1, 3, BLUE[4])
    p.hl(2, 5, 2, BLUE[1])
    p.outline(BLUE[0])
    return p.toCanvas()
  })
}

/**
 * A breaking wave `w`×`h` facing right, 4 frames: a long rising back, a crest at ~70% and a lip that curls over a
 * dark tube, with foam along every top edge and spray flicking off the lip.
 */
export function wave(w: number, h: number): HTMLCanvasElement[] {
  return memo(`wave${w},${h}`, () =>
    [0, 1, 2, 3].map((f) => {
      const p = new Px(w, h)
      const crestX = Math.round(w * 0.7)
      const R = Math.max(6, Math.round(h * 0.34))
      const thick = Math.max(3, Math.round(R * 0.45))
      const back = (x: number) => {
        const u = x / crestX
        return Math.round(h - (h * 0.28 + (h * 0.72 - 2) * u ** 2.2) + Math.sin(x * 0.35 + f * 1.7) * (1 - u))
      }
      const cy = back(crestX) + R
      const cx = crestX
      // Distance below the local surface decides the shade band; the tube is the hollow under the curl.
      const shadeAt = (d: number, y: number, x: number) => {
        if (d < 2) return (x + f) % 4 ? BLUE[4] : WHITE
        if (d < 4) return BLUE[3]
        if ((y * 3 + Math.floor((x + f * 3) / 5)) % 13 === 0 && d > 6) return BLUE[3]
        return y > h - 5 ? BLUE[1] : BLUE[2]
      }
      for (let x = 0; x < w; x++)
        for (let y = 0; y < h; y++) {
          if (x <= crestX) {
            const top = back(x)
            if (y >= top) p.set(x, y, shadeAt(y - top, y, x))
            continue
          }
          const dx = x - cx
          if (dx > R) continue
          const arc = cy - Math.sqrt(Math.max(0, R * R - dx * dx))
          const dist = Math.hypot(dx, y - cy)
          if (y < cy) {
            if (y < arc) continue
            if (dist >= R - thick) p.set(x, y, shadeAt(Math.round(y - arc), y, x))
            else p.set(x, y, (x + y) % 2 ? BLUE[1] : BLUE[0])
          }
          // Below the curl the concave face leans forward toward the bottom.
          else if (dx <= R * 0.25 + (y - cy) * 0.55) p.set(x, y, shadeAt(R, y, x))
        }
      // Spray off the lip, drifting forward frame to frame.
      const r = rng(f + 11)
      for (let i = 0; i < 9; i++) {
        const sx = Math.round(cx + R * (0.2 + r() * 0.9) + f)
        const sy = Math.round(cy - R - 1 - r() * 5 + f * 0.5)
        p.set(sx, sy, i % 3 ? BLUE[4] : WHITE)
      }
      p.outline(BLUE[0])
      return p.toCanvas()
    }),
  )
}

/** DEGEN rocket, 2 frames (flame flicker), facing right. */
export function rocket(): HTMLCanvasElement[] {
  return memo('rocket', () =>
    [0, 1].map((f) => {
      const p = new Px(20, 11)
      const hull = PURPLE
      p.rect(5, 3, 10, 5, hull[2])
      p.hl(5, 3, 10, hull[3])
      p.hl(5, 7, 10, hull[1])
      p.rect(15, 4, 2, 3, hull[3])
      p.set(17, 5, WHITE)
      p.set(16, 4, WHITE)
      p.rect(7, 1, 3, 2, hex('#ff4fa0'))
      p.rect(7, 8, 3, 2, hex('#ff4fa0'))
      p.rect(10, 4, 2, 2, hex('#7dffb1'))
      const flame = f ? 4 : 3
      p.rect(5 - flame, 4, flame, 3, hex('#ff9d2e'))
      p.rect(5 - flame + 1, 5, flame - 1, 1, hex('#ffe27a'))
      if (f) p.set(0, 5, hex('#ffe27a'))
      p.outline(INK)
      return p.toCanvas()
    }),
  )
}

/** Patterned rug strip `w` wide with fringe on both ends. */
export function rug(w: number): HTMLCanvasElement {
  return memo(`rug${w}`, () => {
    const h = 7
    const p = new Px(w + 4, h + 2)
    const a = hex('#b3262e')
    const b = hex('#f2c14e')
    const c = hex('#2a3b8f')
    for (let x = 0; x < w; x++)
      for (let y = 0; y < h; y++) {
        const edge = y === 0 || y === h - 1
        const diamond = Math.abs(((x + 4) % 8) - 4) + Math.abs(y - 3) === 2
        p.set(x + 2, y + 1, edge ? c : diamond ? b : (x + y) % 2 && y % 3 === 0 ? shade(a, -0.2) : a)
      }
    for (let y = 1; y < h + 1; y += 2) {
      p.set(0, y, CREAM)
      p.set(1, y, CREAM)
      p.set(w + 2, y, CREAM)
      p.set(w + 3, y, CREAM)
    }
    p.outline(INK)
    return p.toCanvas()
  })
}

/** Text in the 3×5 font with a 1px outline (and optional drop shadow row). */
export function word(s: string, fill: Col, scale = 1, edge: Col = INK): HTMLCanvasElement {
  return memo(`word${s},${fill},${scale},${edge}`, () => {
    const w = textWidth(s, scale) + 4
    const h = 5 * scale + 5
    const p = new Px(w, h)
    text(p, s, 2, 2, fill, scale)
    // Highlight the top pixel row of each glyph stroke for a little bevel.
    if (scale > 1) p.each((x, y, cur) => (cur && p.get(x, y - 1) === 0 ? shade(fill, 0.55) : 0))
    p.outline(edge, true)
    p.each((x, y, cur) => (!cur && p.get(x, y - 1) === edge && p.get(x, y - 2) !== edge ? edge : 0))
    return p.toCanvas()
  })
}

/** Speech bubble with a tail, holding `s` in the small font. */
export function bubble(s: string, hot: boolean): HTMLCanvasElement {
  return memo(`bub${s},${hot}`, () => {
    const tw = textWidth(s)
    const w = tw + 8
    const h = 13
    const p = new Px(w + 2, h + 4)
    const fill = hot ? hex('#ffe0e0') : WHITE
    p.rect(2, 1, w - 2, h - 2, fill)
    p.rect(1, 2, w, h - 4, fill)
    for (let i = 0; i < 3; i++) p.hl(4 + i, h - 1 + i, 3 - i, fill)
    p.hl(2, h - 2, w - 2, hot ? hex('#ffb0b0') : hex('#d8d6f0'))
    p.outline(INK)
    text(p, s, 5, 4, hot ? hex('#c01a2a') : INK)
    return p.toCanvas()
  })
}

export function plus(col: Col[] = GREEN): HTMLCanvasElement {
  return memo(`plus${col[2]}`, () => {
    const p = new Px(7, 7)
    p.rect(3, 1, 1, 5, col[3])
    p.rect(1, 3, 5, 1, col[3])
    p.set(3, 3, WHITE)
    p.outline(col[0])
    return p.toCanvas()
  })
}

/** Stat arrow: 7 wide, 8 tall, pointing up or down. */
export function arrow(up: boolean, col: Col[]): HTMLCanvasElement {
  return memo(`arr${up},${col[2]}`, () => {
    const p = new Px(9, 10)
    const rows = ['...X...', '..XXX..', '.XXXXX.', 'XXXXXXX', '..XXX..', '..XXX..', '..XXX..']
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++)
        if (row[i] === 'X') p.set(1 + i, 1 + (up ? j : rows.length - 1 - j), i < 3 ? col[4] : i === 3 ? col[3] : col[2])
    })
    p.outline(col[0])
    return p.toCanvas()
  })
}

export function gem(): HTMLCanvasElement {
  return memo('gem', () => {
    const p = new Px(11, 10)
    const c = [hex('#123a6a'), hex('#3b8fe0'), hex('#7fd4ff'), hex('#c8f2ff'), WHITE]
    const rows = ['..3444..', '.234432.', '22333321', '.122221.', '..1221..', '...11...']
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] !== '.') p.set(1 + i, 2 + j, c[Number(row[i])])
    })
    p.outline(c[0])
    return p.toCanvas()
  })
}

export function paper(): HTMLCanvasElement {
  return memo('paper', () => {
    const p = new Px(8, 9)
    p.rect(1, 1, 5, 7, WHITE)
    p.hl(2, 3, 3, hex('#b8b4d0'))
    p.hl(2, 5, 3, hex('#b8b4d0'))
    p.set(5, 1, hex('#d8d6e8'))
    p.outline(hex('#5a5670'))
    return p.toCanvas()
  })
}

/**
 * Storm cloud `w` wide, 2 frames: a heap of puffs (big one in the middle, smaller flanks, a flat underside), lit
 * from above with a dithered terminator; frame 1 cracks a lightning bolt out of the belly.
 */
export function cloud(w: number): HTMLCanvasElement[] {
  return memo(`cloud${w}`, () =>
    [0, 1].map((f) => {
      const h = Math.round(w * 0.5)
      const p = new Px(w + 2, h + 12)
      const ramp5 = [hex('#1c1238'), hex('#3a2e5a'), hex('#5a4a82'), hex('#8a7ab0'), hex('#c4b8e0')]
      const base = Math.round(h * 0.78)
      const puffs: [number, number, number][] = [
        [0.2, 0.6, 0.2],
        [0.42, 0.36, 0.27],
        [0.66, 0.44, 0.24],
        [0.84, 0.64, 0.16],
      ]
      for (const [u, v, r] of puffs) {
        const rad = r * w
        p.ellipse(1 + u * w, v * h + 1, rad, rad * 0.9, (x, y, nx, ny) => {
          const l = -ny * 0.8 - nx * 0.3
          if (l > 0.55) return ramp5[4]
          if (l > 0.15) return (x + y) % 2 && l < 0.3 ? ramp5[2] : ramp5[3]
          return ramp5[2]
        })
      }
      // Flat, shadowed underside so the heap sits on a common base line.
      for (let y = base - 3; y < base + 2; y++)
        for (let x = 3; x < w - 1; x++)
          if (p.get(x, y) || y >= base) p.put(x, y, y >= base ? ramp5[1] : (x + y) % 2 ? ramp5[1] : ramp5[2])
      p.outline(ramp5[0])
      if (f) {
        const bolt = [hex('#fff6b0'), hex('#ffd34d')]
        let x = Math.round(w * 0.45)
        for (let y = base + 2; y < h + 11; y++) {
          p.set(x, y, bolt[0])
          p.set(x + 1, y, bolt[1])
          if (y % 3 === 0) x += (y >> 2) % 2 ? 2 : -2
        }
      }
      return p.toCanvas()
    }),
  )
}

export function moon(r: number): HTMLCanvasElement {
  return memo(`moon${r}`, () => {
    const s = r * 2 + 2
    const p = new Px(s, s)
    const c = [hex('#6e6a8a'), hex('#a8a2c0'), hex('#dcd6ea'), hex('#fffbe6')]
    p.ellipse(s / 2, s / 2, r, r, (_x, _y, nx, ny) => {
      const l = -nx * 0.6 - ny * 0.8
      return l > 0.55 ? c[3] : l > 0 ? c[2] : l > -0.5 ? c[1] : c[0]
    })
    const rr = rng(r * 7919)
    for (let i = 0; i < 5; i++) {
      const cx = s / 2 + (rr() - 0.5) * r
      const cy = s / 2 + (rr() - 0.5) * r
      const cr = 1 + rr() * r * 0.18
      p.ellipse(cx, cy, cr, cr, (x, y) => (p.get(x, y) ? c[1] : 0))
    }
    p.outline(INK)
    return p.toCanvas()
  })
}

/** Glowing orb (drain), 2 frames. */
export function orb(col: Col[] = GREEN): HTMLCanvasElement[] {
  return memo(`orb${col[2]}`, () =>
    [0, 1].map((f) => {
      const p = new Px(9, 9)
      p.ellipse(4.5, 4.5, f ? 3.5 : 3, f ? 3.5 : 3, (_x, _y, nx, ny) => (nx * nx + ny * ny < 0.3 ? WHITE : col[3]))
      p.outline(col[1])
      return p.toCanvas()
    }),
  )
}

/** The Cold Wallet: a Base-blue hardware wallet. Frames: closed, lid-open, locked (dimmed LED). */
export function wallet(premium = false): {
  closed: HTMLCanvasElement
  open: HTMLCanvasElement
  locked: HTMLCanvasElement
} {
  const make = (state: 'closed' | 'open' | 'locked') =>
    memo(`wallet${premium},${state}`, () => {
      const body = premium
        ? [hex('#1a1a24'), hex('#2e2e40'), hex('#4a4a66'), hex('#8a8aa8'), hex('#d0d0e8')]
        : [hex('#001a66'), hex('#0036b0'), hex('#0052ff'), hex('#3d7eff'), hex('#8cb4ff')]
      const p = new Px(16, 16)
      const lid = state === 'open' ? 4 : 0
      // Lower shell.
      p.rect(2, 8, 12, 6, body[2])
      p.hl(2, 8, 12, body[3])
      p.hl(2, 13, 12, body[1])
      p.vl(2, 8, 6, body[3])
      // Screen with a status LED.
      p.rect(5, 10, 6, 2, hex('#0b1030'))
      const led = state === 'locked' ? hex('#7dffb1') : state === 'open' ? hex('#ffe066') : hex('#3aff8a')
      p.set(12, 10, led)
      p.set(6, 10, hex('#5a7cff'))
      // Lid (hinged at the back; pops up when open).
      p.rect(2, 5 - lid, 12, 3, body[3])
      p.hl(2, 5 - lid, 12, body[4])
      p.set(7, 6 - lid, premium ? GOLD[3] : WHITE)
      p.set(8, 6 - lid, premium ? GOLD[3] : WHITE)
      if (state === 'open') p.rect(3, 8, 10, 1, hex('#fff6d0'))
      p.outline(INK)
      return p.toCanvas()
    })
  return { closed: make('closed'), open: make('open'), locked: make('locked') }
}

/** Nearest-neighbour rotation around the centre (pre-baked frames keep wobbles crisp). */
export function rotated(src: HTMLCanvasElement, deg: number): HTMLCanvasElement {
  const key = `rot${deg}`
  const per = rotCache.get(src) ?? new Map<string, HTMLCanvasElement>()
  rotCache.set(src, per)
  const hit = per.get(key)
  if (hit) return hit
  const w = src.width
  const h = src.height
  const s = Math.ceil(Math.hypot(w, h))
  const sd = ctx2d(src).getImageData(0, 0, w, h)
  const s32 = new Uint32Array(sd.data.buffer)
  const out = new Px(s, s)
  const a = (-deg * Math.PI) / 180
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const dx = x + 0.5 - s / 2
      const dy = y + 0.5 - s / 2
      const sx = Math.floor(dx * cos - dy * sin + w / 2)
      const sy = Math.floor(dx * sin + dy * cos + h / 2)
      if (sx >= 0 && sy >= 0 && sx < w && sy < h) out.put(x, y, s32[sy * w + sx])
    }
  const c = out.toCanvas()
  per.set(key, c)
  return c
}
const rotCache = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>()

/** Silhouette of `src` in one flat color (same size). */
export function silhouette(src: HTMLCanvasElement, col: string): HTMLCanvasElement {
  const per = silCache.get(src) ?? new Map<string, HTMLCanvasElement>()
  silCache.set(src, per)
  const hit = per.get(col)
  if (hit) return hit
  const c = canvas(src.width, src.height)
  const x = ctx2d(c)
  x.drawImage(src, 0, 0)
  x.globalCompositeOperation = 'source-in'
  x.fillStyle = col
  x.fillRect(0, 0, c.width, c.height)
  per.set(col, c)
  return c
}
const silCache = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>()

/** Soft pixel ground shadow: solid core with a checker-dithered rim. */
export function shadow(rx: number, ry: number): HTMLCanvasElement {
  return memo(`shadow${rx},${ry}`, () => {
    const p = new Px(rx * 2, ry * 2)
    const core = hex('#140c28', 110)
    p.ellipse(rx, ry, rx, ry, (x, y, nx, ny) => {
      const d = nx * nx + ny * ny
      return d < 0.55 ? core : (x + y) % 2 ? core : 0
    })
    return p.toCanvas()
  })
}

/** Light column used by send-out/recall beams and level-ups: bright core, dithered edges, dissolving at the top. */
export function beam(w: number, h: number, col: Col): HTMLCanvasElement {
  return memo(`beam${w},${h},${col}`, () => {
    const p = new Px(w, h)
    const hi = mix(col, WHITE, 0.6)
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
    p.each((x, y) => {
      // Ordered-dither fade over the top 40% so the column reads as light rising into the air.
      const v = Math.min(1, y / (h * 0.4))
      if (v < 1 && BAYER[(y % 4) * 4 + (x % 4)] / 16 >= v) return 0
      const u = Math.abs(x + 0.5 - w / 2) / (w / 2)
      if (u < 0.3) return WHITE
      if (u < 0.6) return hi
      if (u < 0.85) return col
      return (x + y) % 2 ? col : 0
    })
    return p.toCanvas()
  })
}
