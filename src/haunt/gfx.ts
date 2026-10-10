/**
 * Procedural pixel art for Night of the Cabald. Everything is a `Tex`: a packed ABGR Uint32Array the raycaster samples
 * directly. Alpha is a flag, not a blend: 0 = transparent, 0xff = lit by the scene, EMISSIVE = ignores lighting (glows).
 */

export interface Tex {
  w: number
  h: number
  d: Uint32Array
}

export const EMISSIVE = 0xfe

export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s >>>= 0
    s ^= s >>> 17
    s ^= s << 5
    s >>>= 0
    return s / 4294967296
  }
}

type Ctx = CanvasRenderingContext2D

export function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const x = c.getContext('2d', { willReadFrequently: true }) as Ctx
  x.imageSmoothingEnabled = false
  return [c, x]
}

/** Canvas → Tex. Pixels drawn (alpha ≥ 128) on `glow` become emissive and replace the base pixel. */
export function texOf(c: HTMLCanvasElement, glow?: HTMLCanvasElement): Tex {
  const x = c.getContext('2d') as Ctx
  const d = new Uint32Array(x.getImageData(0, 0, c.width, c.height).data.buffer)
  for (let i = 0; i < d.length; i++) d[i] = d[i] >>> 24 < 128 ? 0 : (d[i] | 0xff000000) >>> 0
  if (glow) {
    const g = new Uint32Array((glow.getContext('2d') as Ctx).getImageData(0, 0, c.width, c.height).data.buffer)
    for (let i = 0; i < d.length; i++) if (g[i] >>> 24 >= 128) d[i] = ((g[i] & 0xffffff) | (EMISSIVE << 24)) >>> 0
  }
  return { w: c.width, h: c.height, d }
}

const rect = (x: Ctx, color: string, px: number, py: number, w = 1, h = 1) => {
  x.fillStyle = color
  x.fillRect(px, py, w, h)
}

/** Per-pixel brightness jitter (and optional hue drift) so flat fills read as material. */
function grit(x: Ctx, w: number, h: number, amount: number, r: () => number) {
  const img = x.getImageData(0, 0, w, h)
  const p = img.data
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue
    const k = 1 - amount + r() * amount * 2
    p[i] = Math.min(255, p[i] * k)
    p[i + 1] = Math.min(255, p[i + 1] * k)
    p[i + 2] = Math.min(255, p[i + 2] * k)
  }
  x.putImageData(img, 0, 0)
}

const pick = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]

/** 3×5 pixel font for engravings (tombstones, ammo boxes). */
const GLYPHS: Record<string, string> = {
  A: '010101111101101',
  B: '110101110101110',
  C: '011100100100011',
  D: '110101101101110',
  E: '111100110100111',
  G: '011100101101011',
  I: '111010010010111',
  K: '101101110101101',
  L: '100100100100111',
  M: '101111111101101',
  N: '110101101101101',
  O: '010101101101010',
  P: '110101110100100',
  R: '110101110101101',
  S: '011100010001110',
  T: '111010010010010',
  U: '101101101101111',
  Y: '101101010010010',
  '.': '000000000000010',
}

function engrave(x: Ctx, text: string, cx: number, y: number, color: string, shadow?: string) {
  const w = text.length * 4 - 1
  let px = Math.round(cx - w / 2)
  for (const ch of text) {
    const g = GLYPHS[ch]
    if (g)
      for (let i = 0; i < 15; i++) {
        if (g[i] !== '1') continue
        if (shadow) rect(x, shadow, px + (i % 3) + 1, y + Math.floor(i / 3) + 1)
        rect(x, color, px + (i % 3), y + Math.floor(i / 3))
      }
    px += 4
  }
}

// ---------------------------------------------------------------- walls (64×64)

export const T = 64

function brick(seed: number, moss: boolean): Tex {
  const r = rng(seed)
  const [c, x] = canvas(T, T)
  rect(x, '#140f19', 0, 0, T, T)
  for (let row = 0; row < 8; row++) {
    const off = row % 2 ? 8 : 0
    for (let col = -1; col < 4; col++) {
      const base = pick(r, ['#4a3b52', '#43354b', '#523f57', '#3d3145', '#4f4353'])
      rect(x, base, col * 16 + off + 1, row * 8 + 1, 15, 7)
      rect(x, '#5f4f66', col * 16 + off + 1, row * 8 + 1, 15, 1)
      if (r() < 0.25) rect(x, '#2b2231', col * 16 + off + 3 + Math.floor(r() * 10), row * 8 + 3, 1 + Math.floor(r() * 3), 1)
    }
  }
  if (moss)
    for (let i = 0; i < 90; i++) {
      const py = 40 + Math.floor(r() * r() * 24)
      rect(x, pick(r, ['#2c4a2a', '#365a30', '#1f3a22']), Math.floor(r() * T), T - 1 - (py - 40), 1 + Math.floor(r() * 2), 1)
    }
  grit(x, T, T, 0.12, r)
  return texOf(c)
}

function cobweb(base: Tex): Tex {
  const [c, x] = canvas(T, T)
  const img = x.createImageData(T, T)
  new Uint32Array(img.data.buffer).set(base.d)
  x.putImageData(img, 0, 0)
  x.strokeStyle = 'rgba(200,200,215,0.55)'
  x.lineWidth = 1
  for (let i = 0; i < 6; i++) {
    const a = (i / 5) * (Math.PI / 2)
    x.beginPath()
    x.moveTo(0.5, 0.5)
    x.lineTo(0.5 + Math.cos(a) * 22, 0.5 + Math.sin(a) * 22)
    x.stroke()
  }
  for (const rr of [6, 11, 16, 21]) {
    x.beginPath()
    for (let i = 0; i <= 5; i++) {
      const a = (i / 5) * (Math.PI / 2)
      const px = 0.5 + Math.cos(a) * rr
      const py = 0.5 + Math.sin(a) * rr
      i ? x.lineTo(px, py) : x.moveTo(px, py)
    }
    x.stroke()
  }
  return texOf(c)
}

function woodPanel(seed: number): [HTMLCanvasElement, Ctx] {
  const r = rng(seed)
  const [c, x] = canvas(T, T)
  for (let p = 0; p < 8; p++) {
    rect(x, pick(r, ['#3b2216', '#42261a', '#36200f', '#3f2416']), p * 8, 0, 8, T)
    rect(x, '#1c0f08', p * 8, 0, 1, T)
    for (let g = 0; g < 5; g++) rect(x, '#2c180e', p * 8 + 2 + Math.floor(r() * 5), Math.floor(r() * T), 1, 4 + Math.floor(r() * 10))
  }
  rect(x, '#1a0d06', 0, 44, T, 20)
  for (let p = 0; p < 4; p++) {
    rect(x, '#2b170c', p * 16 + 2, 47, 12, 14)
    rect(x, '#3d2213', p * 16 + 3, 48, 10, 12)
  }
  rect(x, '#8a6a2a', 0, 42, T, 2)
  rect(x, '#5c4418', 0, 44, T, 1)
  rect(x, '#8a6a2a', 0, 2, T, 2)
  rect(x, '#2a1609', 0, 0, T, 2)
  grit(x, T, T, 0.1, r)
  return [c, x]
}

/** Wood panelling with a gilded frame around a Remy portrait (or, `haunted`, its spectral negative). */
function portrait(face: CanvasImageSource | null, seed: number, haunted: boolean): Tex {
  const [c, x] = woodPanel(seed)
  rect(x, '#140a04', 13, 7, 38, 44)
  rect(x, '#b08a3a', 14, 8, 36, 42)
  rect(x, '#e2c15e', 14, 8, 36, 1)
  rect(x, '#6e5420', 14, 49, 36, 1)
  rect(x, '#7a5c22', 16, 10, 32, 38)
  rect(x, '#0e0a10', 17, 11, 30, 36)
  if (face) {
    x.drawImage(face, 10, 4, 108, 124, 17, 11, 30, 36)
    const img = x.getImageData(17, 11, 30, 36)
    const p = img.data
    for (let i = 0; i < p.length; i += 4) {
      const lum = p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11
      if (haunted) {
        const n = 255 - lum
        p[i] = n * 0.25
        p[i + 1] = Math.min(255, n * 1.05)
        p[i + 2] = n * 0.55
      } else {
        // Old varnish: warm, darker, slightly desaturated.
        p[i] = Math.min(255, (p[i] * 0.7 + lum * 0.3) * 0.82 + 10)
        p[i + 1] = (p[i + 1] * 0.7 + lum * 0.3) * 0.72 + 4
        p[i + 2] = (p[i + 2] * 0.7 + lum * 0.3) * 0.55
      }
    }
    x.putImageData(img, 17, 11)
  }
  const [g, gx] = canvas(T, T)
  if (haunted && face) {
    // The varnish peels back to a glow at the edges.
    gx.fillStyle = '#7dff9a'
    for (let i = 0; i < 30; i++) gx.fillRect(17 + (i % 2 ? 0 : 29), 11 + i + 3, 1, 1)
  }
  return texOf(c, haunted ? g : undefined)
}

function stone(seed: number, skull: boolean): Tex {
  const r = rng(seed)
  const [c, x] = canvas(T, T)
  rect(x, '#151917', 0, 0, T, T)
  for (let row = 0; row < 4; row++) {
    const off = row % 2 ? 16 : 0
    for (let col = -1; col < 3; col++) {
      rect(x, pick(r, ['#3a423d', '#353d38', '#414a44', '#38403a']), col * 32 + off + 1, row * 16 + 1, 31, 15)
      rect(x, '#4e5850', col * 32 + off + 1, row * 16 + 1, 31, 1)
      rect(x, '#262c28', col * 32 + off + 1, row * 16 + 15, 31, 1)
    }
  }
  for (let i = 0; i < 4; i++) {
    let px = Math.floor(r() * T)
    let py = Math.floor(r() * T)
    for (let k = 0; k < 9; k++) {
      rect(x, '#1b201d', px, py)
      px += Math.floor(r() * 3) - 1
      py += 1
    }
  }
  if (skull) {
    rect(x, '#20261f', 22, 18, 20, 26)
    rect(x, '#9a9a88', 24, 20, 16, 14)
    rect(x, '#9a9a88', 27, 34, 10, 6)
    rect(x, '#1a1a14', 27, 25, 4, 4)
    rect(x, '#1a1a14', 33, 25, 4, 4)
    rect(x, '#1a1a14', 31, 30, 2, 2)
    for (let t = 0; t < 4; t++) rect(x, '#1a1a14', 28 + t * 2, 37, 1, 3)
  }
  grit(x, T, T, 0.12, r)
  const [g, gx] = canvas(T, T)
  if (skull) {
    gx.fillStyle = '#5dff6a'
    gx.fillRect(28, 26, 2, 2)
    gx.fillRect(34, 26, 2, 2)
  }
  return texOf(c, skull ? g : undefined)
}

function hedge(seed: number): Tex {
  const r = rng(seed)
  const [c, x] = canvas(T, T)
  rect(x, '#0b1f10', 0, 0, T, T)
  for (let i = 0; i < 700; i++)
    rect(x, pick(r, ['#16361d', '#1d4424', '#25522b', '#0f2a15', '#2d5e31']), Math.floor(r() * T), Math.floor(r() * T), 2, 2)
  for (let i = 0; i < 60; i++) rect(x, '#3a7038', Math.floor(r() * T), Math.floor(r() * T))
  return texOf(c)
}

function windowWall(seed: number, ghost: boolean): Tex {
  const r = rng(seed)
  const base = brick(seed, false)
  const [c, x] = canvas(T, T)
  const img = x.createImageData(T, T)
  new Uint32Array(img.data.buffer).set(base.d)
  x.putImageData(img, 0, 0)
  const [g, gx] = canvas(T, T)
  rect(x, '#1b0f08', 18, 10, 28, 44)
  x.fillStyle = '#1b0f08'
  x.beginPath()
  x.arc(32, 22, 14, Math.PI, 0)
  x.fill()
  const glass = gx.createLinearGradient(0, 10, 0, 52)
  glass.addColorStop(0, '#ffd27a')
  glass.addColorStop(1, '#ff7a1a')
  gx.fillStyle = glass
  gx.beginPath()
  gx.arc(32, 22, 11, Math.PI, 0)
  gx.fill()
  gx.fillRect(21, 22, 22, 29)
  // Mullions and a silhouette watching from inside.
  gx.clearRect(31, 11, 2, 40)
  gx.clearRect(21, 34, 22, 2)
  rect(x, '#1b0f08', 31, 11, 2, 40)
  rect(x, '#1b0f08', 21, 34, 22, 2)
  if (ghost) {
    gx.clearRect(24, 38, 6, 13)
    gx.clearRect(23, 40, 8, 11)
    gx.clearRect(25, 37, 4, 2)
  }
  rect(x, '#5a4a52', 16, 53, 32, 3)
  for (let i = 0; i < 12; i++) rect(x, '#2a1d2c', 16 + Math.floor(r() * 32), 54)
  return texOf(c, g)
}

// ---------------------------------------------------------------- floors / ceilings (64×64)

function planks(seed: number): Tex {
  const r = rng(seed)
  const [c, x] = canvas(T, T)
  for (let row = 0; row < 8; row++) {
    const seam = Math.floor(r() * 48) + 8
    rect(x, pick(r, ['#3a2618', '#33200f', '#402a1a', '#2f1d10']), 0, row * 8, T, 8)
    rect(x, '#170c05', 0, row * 8, T, 1)
    rect(x, '#170c05', seam, row * 8, 1, 8)
    for (let k = 0; k < 4; k++) rect(x, '#2a180b', Math.floor(r() * T), row * 8 + 2 + Math.floor(r() * 5), 3 + Math.floor(r() * 8), 1)
  }
  grit(x, T, T, 0.12, r)
  return texOf(c)
}

function checker(seed: number): Tex {
  const r = rng(seed)
  const [c, x] = canvas(T, T)
  rect(x, '#141018', 0, 0, 32, 32)
  rect(x, '#141018', 32, 32, 32, 32)
  rect(x, '#3a2448', 32, 0, 32, 32)
  rect(x, '#3a2448', 0, 32, 32, 32)
  x.strokeStyle = 'rgba(160,120,190,0.35)'
  for (let v = 0; v < 5; v++) {
    x.beginPath()
    let px = r() * T
    let py = r() * T
    x.moveTo(px, py)
    for (let k = 0; k < 6; k++) {
      px += (r() - 0.5) * 16
      py += (r() - 0.5) * 16
      x.lineTo(px, py)
    }
    x.stroke()
  }
  grit(x, T, T, 0.06, r)
  return texOf(c)
}

function carpet(seed: number): Tex {
  const r = rng(seed)
  const [c, x] = canvas(T, T)
  rect(x, '#4c0c14', 0, 0, T, T)
  for (let k = 0; k < 2; k++)
    for (let j = 0; j < 2; j++) {
      const cx = 16 + k * 32
      const cy = 16 + j * 32
      x.fillStyle = '#7a1a22'
      x.beginPath()
      x.moveTo(cx, cy - 10)
      x.lineTo(cx + 10, cy)
      x.lineTo(cx, cy + 10)
      x.lineTo(cx - 10, cy)
      x.fill()
      x.fillStyle = '#a07020'
      x.fillRect(cx - 1, cy - 1, 3, 3)
      x.fillRect(cx - 7, cy, 2, 1)
      x.fillRect(cx + 6, cy, 2, 1)
    }
  grit(x, T, T, 0.1, r)
  return texOf(c)
}

function grass(seed: number): Tex {
  const r = rng(seed)
  const [c, x] = canvas(T, T)
  rect(x, '#10220f', 0, 0, T, T)
  for (let i = 0; i < 500; i++)
    rect(x, pick(r, ['#16301a', '#1d3a1b', '#244521', '#0c1a0b']), Math.floor(r() * T), Math.floor(r() * T), 1, 2)
  for (let i = 0; i < 9; i++) {
    const px = Math.floor(r() * 62)
    const py = Math.floor(r() * 62)
    const col = pick(r, ['#8a4a12', '#a05a14', '#6e2e0e', '#b0761c'])
    rect(x, col, px, py, 2, 1)
    rect(x, col, px + 1, py + 1, 1, 1)
  }
  return texOf(c)
}

function dirt(seed: number): Tex {
  const r = rng(seed)
  const [c, x] = canvas(T, T)
  rect(x, '#2a1f17', 0, 0, T, T)
  for (let i = 0; i < 300; i++) rect(x, pick(r, ['#33271d', '#231a12', '#3c2f23']), Math.floor(r() * T), Math.floor(r() * T))
  for (let i = 0; i < 20; i++) rect(x, '#4a4038', Math.floor(r() * T), Math.floor(r() * T), 2, 1)
  return texOf(c)
}

function slabs(seed: number, bones: boolean): Tex {
  const r = rng(seed)
  const [c, x] = canvas(T, T)
  rect(x, '#101312', 0, 0, T, T)
  for (let k = 0; k < 4; k++) rect(x, pick(r, ['#262b29', '#2b302d', '#232826']), (k % 2) * 32 + 1, (k >> 1) * 32 + 1, 31, 31)
  if (bones)
    for (let i = 0; i < 4; i++) {
      const px = 4 + Math.floor(r() * 54)
      const py = 4 + Math.floor(r() * 54)
      rect(x, '#8c8a78', px, py, 5, 1)
      rect(x, '#8c8a78', px - 1, py - 1, 1, 3)
      rect(x, '#8c8a78', px + 5, py - 1, 1, 3)
    }
  grit(x, T, T, 0.14, r)
  return texOf(c)
}

function beams(seed: number): Tex {
  const r = rng(seed)
  const [c, x] = canvas(T, T)
  rect(x, '#160d07', 0, 0, T, T)
  for (let b = 0; b < 4; b++) {
    rect(x, '#24160c', 2, b * 16 + 3, 60, 10)
    rect(x, '#2e1d10', 2, b * 16 + 3, 60, 1)
  }
  grit(x, T, T, 0.15, r)
  return texOf(c)
}

// ---------------------------------------------------------------- material tables

export const WALL = { BRICK: 1, WOOD: 2, PORTRAIT: 3, STONE: 4, HEDGE: 5, WINDOW: 6 } as const
export const FLOOR = { PLANKS: 0, CHECKER: 1, CARPET: 2, GRASS: 3, DIRT: 4, CRYPT: 5 } as const

export interface Materials {
  /** wall id → variants; the renderer picks one by a hash of the tile. */
  walls: Tex[][]
  /** Portrait variants as the lightning reveals them. */
  haunted: Tex[]
  floors: Tex[]
  /** Ceiling texture per floor id (outdoor tiles show the sky instead). */
  ceilings: Tex[]
}

export function materials(faces: (CanvasImageSource | null)[]): Materials {
  const b = brick(11, true)
  const walls: Tex[][] = []
  walls[WALL.BRICK] = [b, brick(12, false), cobweb(b), brick(13, true)]
  walls[WALL.WOOD] = [texOf(woodPanel(21)[0]), texOf(woodPanel(22)[0])]
  walls[WALL.PORTRAIT] = faces.map((f, i) => portrait(f, 31 + i, false))
  walls[WALL.STONE] = [stone(41, false), stone(42, false), stone(43, true)]
  walls[WALL.HEDGE] = [hedge(51), hedge(52)]
  walls[WALL.WINDOW] = [windowWall(61, false), windowWall(62, true)]
  const crypt = slabs(81, true)
  const wood = beams(91)
  return {
    walls,
    haunted: faces.map((f, i) => portrait(f, 31 + i, true)),
    floors: [planks(71), checker(72), carpet(73), grass(74), dirt(75), crypt],
    ceilings: [wood, wood, wood, wood, wood, slabs(82, false)],
  }
}

// ---------------------------------------------------------------- sprites

function pumpkinBody(x: Ctx, cx: number, cy: number, rx: number, ry: number) {
  const colors = ['#c24e06', '#e0670c', '#f07a14', '#e0670c', '#c24e06']
  for (let i = 0; i < 5; i++) {
    x.fillStyle = colors[i]
    x.beginPath()
    x.ellipse(cx + (i - 2) * rx * 0.36, cy, rx * 0.46, ry, 0, 0, Math.PI * 2)
    x.fill()
  }
  x.fillStyle = '#ffa040'
  x.fillRect(Math.round(cx - rx * 0.15), Math.round(cy - ry * 0.75), 2, Math.round(ry * 0.5))
  x.fillStyle = '#2f5a17'
  x.fillRect(Math.round(cx - 1), Math.round(cy - ry - 3), 3, 5)
  x.fillStyle = '#1d3a0c'
  x.fillRect(Math.round(cx + 1), Math.round(cy - ry - 4), 3, 2)
}

/** Jack-o'-lantern: `evil` is the kamikaze enemy, `lit` the face glows (frames alternate the flicker). */
export function jack(evil: boolean, frame: number): Tex {
  const [c, x] = canvas(32, 32)
  const [g, gx] = canvas(32, 32)
  pumpkinBody(x, 16, 19, 14, 11)
  const hot = frame ? '#ffe680' : '#ffb21e'
  gx.fillStyle = evil ? (frame ? '#ffef9a' : '#ff8a1a') : hot
  const tri = (ax: number, ay: number, bx: number, by: number, cx2: number, cy2: number) => {
    gx.beginPath()
    gx.moveTo(ax, ay)
    gx.lineTo(bx, by)
    gx.lineTo(cx2, cy2)
    gx.fill()
  }
  if (evil) {
    tri(7, 13, 14, 16, 8, 18)
    tri(25, 13, 18, 16, 24, 18)
    gx.fillRect(7, 22, 18, 3)
    gx.fillRect(9, 25, 14, 2)
    gx.clearRect(9, 22, 2, 2)
    gx.clearRect(14, 22, 2, 2)
    gx.clearRect(19, 22, 2, 2)
    gx.clearRect(12, 25, 2, 2)
    gx.clearRect(17, 25, 2, 2)
  } else {
    tri(8, 17, 11, 12, 14, 17)
    tri(18, 17, 21, 12, 24, 17)
    tri(14, 21, 16, 18, 18, 21)
    gx.fillRect(8, 23, 16, 2)
    gx.fillRect(10, 25, 12, 1)
    gx.clearRect(11, 23, 2, 1)
    gx.clearRect(19, 23, 2, 1)
  }
  return texOf(c, g)
}

export function candelabra(frame: number): Tex {
  const [c, x] = canvas(24, 48)
  const [g, gx] = canvas(24, 48)
  rect(x, '#8a6a2a', 11, 14, 2, 30)
  rect(x, '#b08a3a', 8, 42, 8, 2)
  rect(x, '#6e5420', 6, 44, 12, 4)
  rect(x, '#8a6a2a', 3, 18, 18, 2)
  rect(x, '#8a6a2a', 3, 14, 2, 5)
  rect(x, '#8a6a2a', 19, 14, 2, 5)
  for (const cx of [3, 11, 19]) {
    rect(x, '#e8e0cc', cx, 7, 2, 7)
    rect(x, '#c8bfa8', cx, 12, 2, 2)
    gx.fillStyle = '#ffcf5a'
    gx.fillRect(cx, 2 + (frame && cx === 11 ? 1 : 0), 2, 4)
    gx.fillStyle = '#fff4c4'
    gx.fillRect(cx, 4, 2, 2)
    gx.fillStyle = '#ff8a1a'
    gx.fillRect(cx + (frame ? 1 : 0), 1, 1, 1)
  }
  return texOf(c, g)
}

const EPITAPHS = ['RIP', 'REKT', 'NGMI', 'RUGD', 'GM', 'HODL']
export function tombstone(i: number): Tex {
  const r = rng(100 + i)
  const [c, x] = canvas(32, 36)
  x.fillStyle = '#4d5452'
  x.beginPath()
  x.arc(16, 13, 12, Math.PI, 0)
  x.fill()
  rect(x, '#4d5452', 4, 13, 24, 21)
  rect(x, '#646c69', 5, 6, 2, 26)
  rect(x, '#2e3433', 27, 12, 1, 22)
  rect(x, '#1e3a1e', 2, 33, 28, 3)
  for (let k = 0; k < 10; k++) rect(x, '#2c5a2a', 2 + Math.floor(r() * 28), 31 + Math.floor(r() * 3))
  grit(x, 32, 36, 0.12, r)
  engrave(x, EPITAPHS[i % EPITAPHS.length], 16, 14, '#262a29', '#6c7471')
  rect(x, '#262a29', 10, 23, 12, 1)
  rect(x, '#262a29', 12, 26, 8, 1)
  return texOf(c)
}

export function bat(frame: number): Tex {
  const [c, x] = canvas(16, 8)
  const [g, gx] = canvas(16, 8)
  rect(x, '#120a14', 6, 2, 4, 4)
  if (frame) {
    rect(x, '#120a14', 1, 0, 5, 2)
    rect(x, '#120a14', 10, 0, 5, 2)
    rect(x, '#120a14', 3, 2, 3, 1)
    rect(x, '#120a14', 10, 2, 3, 1)
  } else {
    rect(x, '#120a14', 1, 4, 5, 2)
    rect(x, '#120a14', 10, 4, 5, 2)
    rect(x, '#120a14', 0, 6, 2, 1)
    rect(x, '#120a14', 14, 6, 2, 1)
  }
  gx.fillStyle = '#ff2a2a'
  gx.fillRect(7, 3, 1, 1)
  gx.fillRect(9, 3, 1, 1)
  return texOf(c, g)
}

export function fireball(frame: number): Tex {
  const [c] = canvas(12, 12)
  const [g, gx] = canvas(12, 12)
  gx.fillStyle = '#3cff5a'
  gx.beginPath()
  gx.arc(6, 6, frame ? 5.5 : 5, 0, Math.PI * 2)
  gx.fill()
  gx.fillStyle = '#b8ffb0'
  gx.beginPath()
  gx.arc(6, 6, 3, 0, Math.PI * 2)
  gx.fill()
  gx.fillStyle = '#ffffff'
  gx.fillRect(5, 5, 2, 2)
  ;(c.getContext('2d') as Ctx).drawImage(g, 0, 0)
  return texOf(c, g)
}

export function blast(frame: number): Tex {
  const r = rng(200 + frame)
  const [c] = canvas(32, 32)
  const [g, gx] = canvas(32, 32)
  const rad = 6 + frame * 3.5
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2
    const d = r() * rad
    gx.fillStyle = pick(r, frame > 2 ? ['#ff6a00', '#c03000', '#ffb000'] : ['#fff2a0', '#ffd040', '#ff9a10'])
    const s = 2 + Math.floor(r() * 4)
    gx.fillRect(16 + Math.cos(a) * d - s / 2, 16 + Math.sin(a) * d - s / 2, s, s)
  }
  ;(c.getContext('2d') as Ctx).drawImage(g, 0, 0)
  return texOf(c, g)
}

export type PickupKind = 'candy' | 'corn' | 'shells' | 'pumpkins' | 'boomstick' | 'rush' | 'launcher'

export function pickupTex(kind: PickupKind): Tex {
  const [c, x] = canvas(24, 14)
  const [g, gx] = canvas(24, 14)
  switch (kind) {
    case 'candy': {
      x.fillStyle = '#a42cd6'
      x.beginPath()
      x.moveTo(1, 3)
      x.lineTo(7, 7)
      x.lineTo(1, 11)
      x.fill()
      x.beginPath()
      x.moveTo(23, 3)
      x.lineTo(17, 7)
      x.lineTo(23, 11)
      x.fill()
      x.fillStyle = '#f2f2f2'
      x.beginPath()
      x.arc(12, 7, 6, 0, Math.PI * 2)
      x.fill()
      x.fillStyle = '#e8222e'
      for (let k = 0; k < 3; k++) {
        x.beginPath()
        x.arc(12, 7, 6, k * 2.1, k * 2.1 + 0.9)
        x.lineTo(12, 7)
        x.fill()
      }
      break
    }
    case 'corn':
      for (let k = 0; k < 4; k++) {
        const ox = 2 + k * 5 + (k % 2)
        const oy = k % 2 ? 4 : 2
        rect(x, '#f6f1dc', ox + 1, oy, 2, 2)
        rect(x, '#ff9a14', ox, oy + 2, 4, 3)
        rect(x, '#ffd020', ox, oy + 5, 4, 3)
      }
      break
    case 'shells':
      rect(x, '#7a1010', 2, 3, 20, 11)
      rect(x, '#a81c1c', 2, 3, 20, 2)
      engrave(x, 'BOOM', 12, 7, '#ffd27a')
      break
    case 'pumpkins':
      pumpkinBody(x, 6, 9, 5, 4)
      pumpkinBody(x, 17, 9, 5, 4)
      pumpkinBody(x, 12, 10, 5, 4)
      break
    case 'boomstick':
      rect(x, '#2a2a30', 1, 5, 16, 2)
      rect(x, '#3a3a42', 1, 7, 16, 1)
      rect(x, '#6a3a1a', 15, 6, 8, 4)
      rect(x, '#4a280e', 18, 9, 5, 3)
      gx.fillStyle = '#ffe680'
      gx.fillRect(0, 1, 24, 1)
      break
    case 'rush':
      for (let k = 0; k < 3; k++) rect(x, k % 2 ? '#f2f2f2' : '#e8222e', 1, 4 + k * 2, 14, 2)
      rect(x, '#5a2a8a', 14, 3, 7, 8)
      rect(x, '#3a1a5a', 16, 10, 3, 3)
      gx.fillStyle = '#ffe680'
      gx.fillRect(0, 1, 24, 1)
      break
    case 'launcher':
      rect(x, '#2f5a17', 1, 4, 18, 6)
      rect(x, '#3e7a20', 1, 4, 18, 2)
      rect(x, '#1d3a0c', 12, 9, 3, 4)
      pumpkinBody(x, 3, 7, 3, 3)
      gx.fillStyle = '#ffe680'
      gx.fillRect(0, 1, 24, 1)
      break
  }
  return texOf(c, g)
}

/** White sheet ghost, used when a Remy sprite cannot load. */
export function sheetGhost(): Tex {
  const [c, x] = canvas(32, 40)
  x.fillStyle = '#e8f0ff'
  x.beginPath()
  x.arc(16, 14, 12, Math.PI, 0)
  x.lineTo(28, 38)
  for (let k = 0; k < 4; k++) x.lineTo(25 - k * 6, k % 2 ? 38 : 34)
  x.lineTo(4, 38)
  x.fill()
  rect(x, '#101018', 10, 12, 4, 6)
  rect(x, '#101018', 18, 12, 4, 6)
  return texOf(c)
}

// ---------------------------------------------------------------- Remy-derived monsters

const lumOf = (c: number) => (c & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + ((c >> 16) & 255) * 0.11
const pack = (r: number, g: number, b: number, a = 0xff) =>
  ((a << 24) | (Math.min(255, Math.max(0, b)) << 16) | (Math.min(255, Math.max(0, g)) << 8) | Math.min(255, Math.max(0, r))) >>> 0

function mapTex(t: Tex, f: (c: number, x: number, y: number) => number): Tex {
  const d = new Uint32Array(t.d.length)
  for (let y = 0; y < t.h; y++)
    for (let x = 0; x < t.w; x++) {
      const c = t.d[y * t.w + x]
      d[y * t.w + x] = c >>> 24 ? f(c, x, y) : 0
    }
  return { w: t.w, h: t.h, d }
}

/** Cabald grunt: the bald Remy, rotted green, with blood at the hem. */
export function zombify(t: Tex, seed: number): Tex {
  const r = rng(seed)
  return mapTex(t, (c, _x, y) => {
    const R = c & 255
    const G = (c >> 8) & 255
    const B = (c >> 16) & 255
    const l = lumOf(c)
    if (r() < 0.035) return pack(l * 0.3, l * 0.45, l * 0.25)
    if (y > t.h * 0.72 && r() < 0.05) return pack(120, 10, 14)
    return pack(R * 0.45 + l * 0.2 + 8, G * 0.55 + l * 0.35 + 22, B * 0.35 + l * 0.12 + 6)
  })
}

/** Ghost: any Remy as a cold, glowing negative whose hem dissolves into a wavy tail. */
export function ghostify(t: Tex): Tex {
  let bottom = 0
  for (let i = 0; i < t.d.length; i++) if (t.d[i] >>> 24) bottom = Math.floor(i / t.w)
  const tail = bottom * 0.7
  return mapTex(t, (c, x, y) => {
    if (y > tail && y > tail + (bottom - tail) * (0.55 + 0.45 * Math.sin(x * 0.55))) return 0
    const l = lumOf(c)
    return pack(l * 0.55 + 70, l * 0.75 + 95, l * 0.6 + 150, EMISSIVE)
  })
}

/** Cabald admin / boss: royal purple robes and, for the boss, a glowing aura outline. */
export function cabaldify(t: Tex, aura: boolean): Tex {
  const out = mapTex(t, (c) => {
    const l = lumOf(c)
    const R = c & 255
    const B = (c >> 16) & 255
    return pack(R * 0.5 + l * 0.35 + 18, l * 0.42, B * 0.45 + l * 0.5 + 30)
  })
  if (!aura) return out
  const d = out.d
  const src = d.slice()
  for (let y = 1; y < t.h - 1; y++)
    for (let x = 1; x < t.w - 1; x++) {
      const i = y * t.w + x
      if (src[i] >>> 24) continue
      if (src[i - 1] >>> 24 || src[i + 1] >>> 24 || src[i - t.w] >>> 24 || src[i + t.w] >>> 24) d[i] = pack(190, 60, 255, EMISSIVE)
    }
  return out
}

export function flipX(t: Tex): Tex {
  const d = new Uint32Array(t.d.length)
  for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) d[y * t.w + x] = t.d[y * t.w + (t.w - 1 - x)]
  return { w: t.w, h: t.h, d }
}

// ---------------------------------------------------------------- first-person weapons

export interface ViewModel {
  tex: Tex
  /** Muzzle position inside tex, where the flash is centred. */
  mx: number
  my: number
}

/** Hands use the player's Remy palette (skin + shirt sleeve). */
export function viewModels(skin: string, sleeve: string): { idle: ViewModel[]; flash: Tex[] } {
  const hand = (x: Ctx, px: number, py: number, w: number, h: number) => {
    rect(x, sleeve, px - 3, py + h - 4, w + 6, 12)
    rect(x, 'rgba(0,0,0,0.25)', px - 3, py + h - 4, w + 6, 2)
    x.fillStyle = skin
    x.beginPath()
    x.roundRect(px, py, w, h, 3)
    x.fill()
    rect(x, 'rgba(0,0,0,0.18)', px + 1, py + Math.floor(h / 3), w - 2, 1)
    rect(x, 'rgba(0,0,0,0.18)', px + 1, py + Math.floor((h * 2) / 3), w - 2, 1)
  }
  // 0 CANDY POPPER: a peppermint-striped hand cannon.
  const [c0, x0] = canvas(64, 72)
  x0.fillStyle = '#d8d8d8'
  x0.beginPath()
  x0.moveTo(24, 6)
  x0.lineTo(40, 6)
  x0.lineTo(44, 46)
  x0.lineTo(20, 46)
  x0.fill()
  x0.save()
  x0.clip()
  for (let k = -4; k < 12; k++) {
    x0.fillStyle = '#e01e2a'
    x0.beginPath()
    x0.moveTo(10, k * 8)
    x0.lineTo(54, k * 8 - 14)
    x0.lineTo(54, k * 8 - 10)
    x0.lineTo(10, k * 8 + 4)
    x0.fill()
  }
  x0.restore()
  rect(x0, '#ffffff', 26, 8, 2, 36)
  rect(x0, '#5a0a10', 28, 4, 8, 4)
  rect(x0, '#1a0a0c', 30, 5, 4, 2)
  hand(x0, 18, 44, 28, 20)
  // 1 BOOMSTICK: double barrel, carved pumpkin-orange stock.
  const [c1, x1] = canvas(80, 72)
  for (const [bx, sh] of [
    [27, '#3a3a44'],
    [41, '#30303a'],
  ] as const) {
    x1.fillStyle = sh
    x1.beginPath()
    x1.moveTo(bx + 2, 4)
    x1.lineTo(bx + 11, 4)
    x1.lineTo(bx + 13, 44)
    x1.lineTo(bx - 1, 44)
    x1.fill()
    rect(x1, '#0a0a0e', bx + 4, 3, 5, 4)
    rect(x1, '#6a6a78', bx + 3, 8, 1, 34)
  }
  rect(x1, '#7a3a10', 20, 40, 40, 14)
  rect(x1, '#a65418', 20, 40, 40, 3)
  rect(x1, '#ffb21e', 36, 46, 2, 2)
  rect(x1, '#ffb21e', 42, 46, 2, 2)
  rect(x1, '#ffb21e', 37, 50, 6, 1)
  hand(x1, 12, 46, 22, 18)
  hand(x1, 48, 48, 22, 16)
  // 2 SUGAR RUSH: rotary candy gatling.
  const [c2, x2] = canvas(80, 72)
  const barrels = ['#f2f2f2', '#e01e2a', '#ffd020', '#7ad04a', '#a42cd6']
  for (let k = 0; k < 5; k++) {
    const bx = 22 + k * 7
    x2.fillStyle = barrels[k]
    x2.beginPath()
    x2.moveTo(bx + 2, 8 + Math.abs(k - 2) * 2)
    x2.lineTo(bx + 7, 8 + Math.abs(k - 2) * 2)
    x2.lineTo(bx + 8, 42)
    x2.lineTo(bx, 42)
    x2.fill()
    rect(x2, '#1a1a1a', bx + 3, 7 + Math.abs(k - 2) * 2, 3, 2)
  }
  rect(x2, '#5a2a8a', 16, 38, 48, 16)
  rect(x2, '#7a3aba', 16, 38, 48, 3)
  rect(x2, '#ffd020', 30, 44, 20, 4)
  hand(x2, 10, 48, 20, 16)
  hand(x2, 50, 48, 20, 16)
  // 3 JACK LAUNCHER: vine-green tube, a jack-o'-lantern loaded at the mouth.
  const [c3, x3] = canvas(80, 76)
  x3.fillStyle = '#2f5a17'
  x3.beginPath()
  x3.moveTo(26, 16)
  x3.lineTo(54, 16)
  x3.lineTo(60, 56)
  x3.lineTo(20, 56)
  x3.fill()
  rect(x3, '#4a8a26', 30, 18, 3, 36)
  rect(x3, '#1d3a0c', 24, 26, 32, 3)
  rect(x3, '#1d3a0c', 22, 40, 36, 3)
  pumpkinBody(x3, 40, 13, 11, 8)
  const [g3, gx3] = canvas(80, 76)
  gx3.fillStyle = '#ffb21e'
  gx3.fillRect(34, 11, 3, 3)
  gx3.fillRect(43, 11, 3, 3)
  gx3.fillRect(35, 16, 10, 2)
  hand(x3, 12, 54, 20, 16)
  hand(x3, 50, 54, 20, 16)
  const flash = (size: number, hot: string) => {
    const [fc] = canvas(size, size)
    const [fg, fgx] = canvas(size, size)
    const r = rng(size)
    for (let i = 0; i < 40; i++) {
      const a = r() * Math.PI * 2
      const d = r() * size * 0.45
      fgx.fillStyle = pick(r, [hot, '#fff4c4', '#ff9a10'])
      fgx.fillRect(size / 2 + Math.cos(a) * d - 1, size / 2 + Math.sin(a) * d * 0.7 - 1, 3, 3)
    }
    fgx.fillStyle = '#ffffff'
    fgx.fillRect(size / 2 - 3, size / 2 - 2, 6, 4)
    return texOf(fc, fg)
  }
  return {
    idle: [
      { tex: texOf(c0), mx: 32, my: 4 },
      { tex: texOf(c1), mx: 40, my: 2 },
      { tex: texOf(c2), mx: 40, my: 8 },
      { tex: texOf(c3, g3), mx: 40, my: 6 },
    ],
    flash: [flash(20, '#ff4a6a'), flash(30, '#ffd040'), flash(22, '#ffe680'), flash(26, '#ff9a10')],
  }
}
