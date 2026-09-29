/**
 * The UI's pixel-art skin. Window frames, cursors, badges, icons and backdrops are drawn once into tiny canvases and
 * handed to CSS as data-URL custom properties, so every DOM window is a true 9-slice drawn at an integer scale
 * (1rem = 1 logical pixel). Remy sprites for menus are drawn 1:1 from `art.sprite`, never resampled.
 */
import { SPRITE_H, SPRITE_W, art } from './art'
import { type RType, TYPE_COLOR } from './data'
import { type Col, Px, canvas, ctx2d, hex, shade, stamp, text, textWidth } from './gfx/px'

/** The shared UI palette; CSS mirrors these as --ink, --paper, … (see applySkin). */
export const PAL = {
  ink: '#10132e',
  ink2: '#262c5c',
  night: '#141a46',
  navy: '#1c2a78',
  blue: '#2f5fe8',
  base: '#0052ff',
  sky: '#78a4ff',
  ice: '#c4d6ff',
  paper: '#fbf6e9',
  paper2: '#ece2c8',
  paperInk: '#34354f',
  paperShade: '#d7ccb0',
  gold: '#ffd34a',
  gold2: '#e5961c',
  goldInk: '#7a3d0c',
  red: '#e8413c',
  green: '#3ccf6e',
} as const

type Layer = string | readonly [string, string]

interface FrameSpec {
  /** Outer → inner rings; a pair is [top-left, bottom-right] for bevels. */
  layers: readonly Layer[]
  radius: number
  fill?: string
}

/** Rounded rect membership by pixel centre; `r*r + r` gives the classic stepped pixel-art corner. */
function inside(size: number, x: number, y: number, inset: number, radius: number) {
  const r = Math.max(0, radius - inset)
  const lo = inset
  const hi = size - 1 - inset
  if (x < lo || y < lo || x > hi || y > hi) return false
  const cx = x < lo + r ? lo + r : x > hi - r ? hi - r : x
  const cy = y < lo + r ? lo + r : y > hi - r ? hi - r : y
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r + r
}

/** A square 9-slice source; returns the CSS `border-image` source+slice and the matching border width. */
function frame({ layers, radius, fill }: FrameSpec): { src: string; width: string } {
  const slice = Math.max(layers.length, radius + 1)
  const size = slice * 2 + 2
  const p = new Px(size, size)
  layers.forEach((layer, i) => {
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        if (!inside(size, x, y, i, radius)) continue
        const c = typeof layer === 'string' ? layer : x + y < size - 1 ? layer[0] : layer[1]
        p.put(x, y, hex(c))
      }
  })
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (!inside(size, x, y, layers.length, radius)) continue
      p.put(x, y, fill ? hex(fill) : 0)
    }
  return { src: `url(${p.toCanvas().toDataURL()}) ${slice}${fill ? ' fill' : ''}`, width: `${slice}rem` }
}

const FRAMES = {
  /** Cream dialogue/menu window with a Base-blue double rule. */
  win: frame({
    layers: [PAL.ink, [PAL.sky, PAL.blue], PAL.blue, [PAL.navy, PAL.navy], PAL.ink2, [PAL.paper, PAL.paper2]],
    radius: 3,
    fill: PAL.paper,
  }),
  /** Navy glass card used inside full-screen panels. */
  card: frame({ layers: [PAL.ink, ['#4a63d0', '#24307e'], '#1f2a72'], radius: 2, fill: '#1a2463' }),
  /** Brighter card for the lead / highlighted state. */
  cardLead: frame({ layers: [PAL.ink, ['#7fa6ff', '#2c45b8'], '#3552d6'], radius: 2, fill: '#2d47c4' }),
  /** Fainted card: bruised red. */
  cardDown: frame({ layers: [PAL.ink, ['#c46a7a', '#5a1f33'], '#6c2640'], radius: 2, fill: '#56203a' }),
  /** Animated-gold selection ring (no fill, sits over any card). */
  sel: frame({ layers: [PAL.ink, ['#fff6c4', PAL.gold2], PAL.gold, PAL.ink], radius: 3 }),
  /** Speaker name plate. */
  plate: frame({ layers: [PAL.ink, ['#8fb4ff', '#2340b0']], radius: 2, fill: PAL.blue }),
  /** Dark title strip / header chip. */
  chip: frame({ layers: [PAL.ink, ['#3b4a9c', '#141a46']], radius: 1, fill: '#1e2766' }),
  /** Gold primary button. */
  btn: frame({ layers: [PAL.ink, ['#fff3b8', PAL.gold2]], radius: 2, fill: PAL.gold }),
  /** Recessed well for bars and inputs. */
  well: frame({ layers: [PAL.ink, ['#0b0e24', '#3a4388']], radius: 1, fill: '#0d1234' }),
  /** Recessed cream well inside cream windows. */
  inset: frame({ layers: [['#b9ab88', '#fffdf6']], radius: 1, fill: '#fffaf0' }),
  /** Museum gilt. */
  gilt: frame({
    layers: [PAL.ink, ['#fff0b0', '#8a5a1c'], '#d9a441', ['#8a5a1c', '#fff0b0'], '#3a2612'],
    radius: 1,
    fill: '#2a1d10',
  }),
}

const pxUrl = (p: Px) => `url(${p.toCanvas().toDataURL()})`

/** Draws string-art rows into a fresh buffer. */
function art2px(rows: readonly string[], pal: Record<string, string>): Px {
  const p = new Px(rows[0].length, rows.length)
  const cols: Record<string, Col> = {}
  for (const [k, v] of Object.entries(pal)) cols[k] = hex(v)
  stamp(p, rows, 0, 0, cols)
  return p
}

/** ▶ menu cursor. */
const CURSOR = art2px(
  ['k.....', 'kk....', 'krk...', 'khrk..', 'khrrk.', 'khrk..', 'krk...', 'kk....', 'k.....'],
  { k: PAL.ink, r: PAL.red, h: '#ff9a7a' },
)
/** ▼ "more text" arrow. */
const MORE = art2px(['kkkkkkk', 'khrrrrk', '.krrrk.', '..krk..', '...k...'], { k: PAL.ink, r: PAL.red, h: '#ff9a7a' })

/** Diagonal Emerald-style panel wallpaper (16px tile; CSS scrolls it one pixel at a time). */
function wallpaper(a: string, b: string, dot: string): Px {
  const p = new Px(16, 16)
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) p.put(x, y, hex((x + y) % 16 < 8 ? a : b))
  for (const [x, y] of [
    [3, 3],
    [11, 11],
  ]) {
    p.put(x, y - 1, hex(dot))
    p.put(x - 1, y, hex(dot))
    p.put(x, y, hex(dot))
    p.put(x + 1, y, hex(dot))
    p.put(x, y + 1, hex(dot))
  }
  return p
}

/** 3×5 caps text in a bordered pill: type badges, tags. */
function pill(label: string, fill: string, w: number): Px {
  const h = 9
  const p = new Px(w, h)
  const base = hex(fill)
  const dark = shade(base, -0.55)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const corner = (x === 0 || x === w - 1) && (y === 0 || y === h - 1)
      if (corner) continue
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1
      p.put(x, y, edge ? hex(PAL.ink) : y === 1 ? shade(base, 0.35) : y >= h - 2 ? shade(base, -0.25) : base)
    }
  const tx = Math.floor((w - textWidth(label)) / 2)
  text(p, label, tx + 1, 3, dark)
  text(p, label, tx, 2, hex('#ffffff'))
  return p
}

const badgeCache = new Map<string, string>()
/** Pixel type badge (GBA-style 28×9 pill) as an <img>. */
export function typeBadge(t: string): string {
  let src = badgeCache.get(t)
  if (!src) {
    src = pill(t, TYPE_COLOR[t as RType] ?? '#777', 28)
      .toCanvas()
      .toDataURL()
    badgeCache.set(t, src)
  }
  return `<img class="tbadge" src="${src}" alt="${t}" draggable="false">`
}

/** Tiny tag like HP / LV / No. drawn in the 3×5 font. */
function tag(label: string, fg: string, bg: string): Px {
  const w = textWidth(label) + 4
  const p = new Px(w, 7)
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < w; x++) if (!((x === 0 || x === w - 1) && (y === 0 || y === 6))) p.put(x, y, hex(bg))
  text(p, label, 2, 1, hex(fg))
  return p
}

const ICONS: Record<string, [string[], Record<string, string>]> = {
  party: [
    [
      '...kkkkkk...',
      '..kHHHHHHk..',
      '.kHhhHHHHHk.',
      '.kHHHHHHHHk.',
      '.kHssssssHk.',
      '.ksksssskskk',
      '.kskssssksk.',
      '.kssssssssk.',
      '..kssrrssk..',
      '...kkkkkk...',
      '..kBBBBBBk..',
      '.kBBbBBbBBk.',
    ],
    { k: PAL.ink, H: '#3d7bff', h: '#9fc0ff', s: '#f6d2b3', r: '#c0504a', B: PAL.gold, b: PAL.gold2 },
  ],
  bag: [
    [
      '....kkkk....',
      '...k....k...',
      '..kkkkkkkk..',
      '.kOOOOOOOOk.',
      '.kOooooooOk.',
      '.kOOOkkOOOk.',
      '.kOOOkyOOOk.',
      '.kOOOOOOOOk.',
      '.kOOOOOOOOk.',
      '.kddddddddk.',
      '..kkkkkkkk..',
      '............',
    ],
    { k: PAL.ink, O: '#d9822b', o: '#f7bd6a', d: '#8a4b10', y: PAL.gold },
  ],
  dex: [
    [
      '.kkkkkkkkkk.',
      'kRRRRRRRRRRk',
      'kRbbRRRRRRRk',
      'kRbwRRRyRgRk',
      'kRRRRRRRRRRk',
      'kkkkkkkkkkkk',
      'kSSSSSSSSSSk',
      'kSGGGGGGGGSk',
      'kSGggGGGGGSk',
      'kSGGGGGGGGSk',
      'kSSSSSSSSSSk',
      '.kkkkkkkkkk.',
    ],
    { k: PAL.ink, R: '#e8413c', b: '#3d7bff', w: '#dfe9ff', y: PAL.gold, g: '#7dffb1', G: '#1d6b4a', S: '#2b2d3a' },
  ],
  card: [
    [
      '............',
      '............',
      'kkkkkkkkkkkk',
      'kbbbbbbbbbbk',
      'kbpppbWWWWbk',
      'kbpfpbbbbbbk',
      'kbpppbWWWbbk',
      'kbbbbbbbbbbk',
      'kbyyyyyyyybk',
      'kkkkkkkkkkkk',
      '............',
      '............',
    ],
    { k: PAL.ink, b: '#3d7bff', p: '#ffe0c0', f: '#d98b5a', W: '#dfe9ff', y: PAL.gold },
  ],
  save: [
    [
      'kkkkkkkkkkk.',
      'kPkwwwwwkPPk',
      'kPkwwkwwkPPk',
      'kPkwwkwwkPPk',
      'kPkkkkkkkPPk',
      'kPPPPPPPPPPk',
      'kPLLLLLLLLPk',
      'kPLllllllLPk',
      'kPLLLLLLLLPk',
      'kPLllllllLPk',
      'kPLLLLLLLLPk',
      'kkkkkkkkkkkk',
    ],
    { k: PAL.ink, P: '#6a4cff', w: '#c9d3ff', L: PAL.paper, l: '#9aa6e0' },
  ],
  sound: [
    [
      '............',
      '.....k......',
      '....kk...b..',
      'kkkkwk.b..b.',
      'kwwwwk..b.b.',
      'kwwwwk..b.b.',
      'kwwwwk..b.b.',
      'kkkkwk.b..b.',
      '....kk...b..',
      '.....k......',
      '............',
      '............',
    ],
    { k: PAL.ink, w: '#dfe9ff', b: '#3d7bff' },
  ],
  mute: [
    [
      '............',
      '.....k......',
      '....kk......',
      'kkkkwk.r...r',
      'kwwwwk..r.r.',
      'kwwwwk...r..',
      'kwwwwk..r.r.',
      'kkkkwk.r...r',
      '....kk......',
      '.....k......',
      '............',
      '............',
    ],
    { k: PAL.ink, w: '#dfe9ff', r: PAL.red },
  ],
  text: [
    [
      '............',
      '.kkkkkkkkkk.',
      'kwwwwwwwwwwk',
      'kwbbwbbbwwwk',
      'kwwwwwwwwwwk',
      'kwbbbwbbwwwk',
      'kwwwwwwwwwwk',
      '.kkwkkkkkkk.',
      '..kwk.......',
      '..kk........',
      '............',
      '............',
    ],
    { k: PAL.ink, w: '#fbf6e9', b: '#3d7bff' },
  ],
  exit: [
    [
      '..kkkkkkkk..',
      '..kDDDDDDk..',
      '..kDddddDk..',
      '..kDdDDdDk..',
      '..kDdDDdDk..',
      '..kDDDDDyk..',
      '..kDdDDdDk..',
      '..kDdDDdDk..',
      '..kDddddDk..',
      '..kDDDDDDk..',
      '.kkkkkkkkkk.',
      '............',
    ],
    { k: PAL.ink, D: '#b86b2e', d: '#8a4b10', y: PAL.gold },
  ],
  star: [
    [
      '.....kk.....',
      '....kyyk....',
      '....kyyk....',
      'kkkkkyykkkkk',
      'kyyyyYYyyyyk',
      '.kyyYYYYyyk.',
      '..kyYYYYyk..',
      '..kyyYYyyk..',
      '.kyyykkyyyk.',
      '.kyyk..kyyk.',
      'kkkk....kkkk',
      '............',
    ],
    { k: PAL.ink, y: PAL.gold, Y: '#fff3b8' },
  ],
}

const iconCache = new Map<string, string>()
/** 12×12 pixel icon as an <img> (see ICONS for names). */
export function icon(name: string): string {
  let src = iconCache.get(name)
  if (src === undefined) {
    const def = ICONS[name]
    src = def ? art2px(def[0], def[1]).toCanvas().toDataURL() : ''
    iconCache.set(name, src)
  }
  return src ? `<img class="ico" src="${src}" alt="" draggable="false">` : ''
}

const kebab = (k: string) => k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

/** Soft pixel shadow under standing sprites: two dithered rings of translucent ink. */
function shadowPx(): Px {
  const p = new Px(56, 10)
  p.ellipse(28, 5, 28, 5, (x, y, nx, ny) => (nx * nx + ny * ny > 0.55 && (x + y) % 2 ? 0 : hex(PAL.ink, 110)))
  return p
}

/** Publishes the skin to CSS: `--f-<frame>` (border-image source + slice), `--fw-<frame>` (width), images, tiles. */
export function applySkin(root: HTMLElement = document.documentElement) {
  const s = root.style
  for (const [name, f] of Object.entries(FRAMES)) {
    s.setProperty(`--f-${kebab(name)}`, f.src)
    s.setProperty(`--fw-${kebab(name)}`, f.width)
  }
  for (const [k, v] of Object.entries(PAL)) s.setProperty(`--${kebab(k)}`, v)
  s.setProperty('--img-cursor', pxUrl(CURSOR))
  s.setProperty('--img-more', pxUrl(MORE))
  s.setProperty('--img-hp', pxUrl(tag('HP', PAL.gold, PAL.ink)))
  s.setProperty('--img-exp', pxUrl(tag('EXP', '#9fd8ff', PAL.ink)))
  s.setProperty('--img-shadow', pxUrl(shadowPx()))
  s.setProperty('--tile-panel', pxUrl(wallpaper('#1b2a80', '#1f3190', '#2a41ad')))
  s.setProperty('--tile-night', pxUrl(wallpaper('#0f1440', '#121948', '#1d2766')))
  s.setProperty('--tile-gold', pxUrl(wallpaper('#f7e3a6', '#f3d98f', '#fff3c8')))
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

/** Bayer-dithered vertical ramp between two colors, `w`×`h` px (no smooth gradients anywhere). */
export function ditherRamp(top: Col, bottom: Col, w: number, h: number): Px {
  const p = new Px(w, h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) p.put(x, y, (y / h) * 16 > BAYER[(y % 4) * 4 + (x % 4)] + 0.5 ? bottom : top)
  return p
}

const stageCache = new Map<number, { bg: string; lo: string }>()
/**
 * A Remy's own backdrop as CSS: `--stage-bg` (4×64 dithered ramp from its art's background color, repeat-x at
 * 4rem 64rem) and `--stage-lo` (the color below the ramp). Returns an inline style string.
 */
export function stageStyle(idx: number): string {
  let hit = stageCache.get(idx)
  if (!hit) {
    const bg = hex(art.get(idx).palette.bg)
    const lo = shade(bg, -0.5)
    hit = { bg: pxUrl(ditherRamp(shade(bg, 0.15), lo, 4, 64)), lo: `rgb(${lo & 255},${(lo >>> 8) & 255},${(lo >>> 16) & 255})` }
    stageCache.set(idx, hit)
  }
  return `--stage-bg:${hit.bg};--stage-lo:${hit.lo}`
}

// ───────────── Remy sprites in the DOM ─────────────

interface Bounds {
  x0: number
  y0: number
  x1: number
  y1: number
}
const bounds = new Map<number, Bounds>()

/** Opaque bounding box of a sprite, cached; lets busts frame the head whatever the pose or fallback. */
function spriteBounds(idx: number, sprite: HTMLCanvasElement): Bounds {
  const hit = bounds.get(idx)
  if (hit) return hit
  const d = ctx2d(sprite).getImageData(0, 0, SPRITE_W, SPRITE_H).data
  const b = { x0: SPRITE_W, y0: SPRITE_H, x1: 0, y1: 0 }
  for (let y = 0; y < SPRITE_H; y++)
    for (let x = 0; x < SPRITE_W; x++)
      if (d[(y * SPRITE_W + x) * 4 + 3] > 127) {
        b.x0 = Math.min(b.x0, x)
        b.x1 = Math.max(b.x1, x)
        b.y0 = Math.min(b.y0, y)
        b.y1 = Math.max(b.y1, y)
      }
  if (b.x1 < b.x0) Object.assign(b, { x0: 0, y0: 0, x1: SPRITE_W - 1, y1: SPRITE_H - 1 })
  bounds.set(idx, b)
  return b
}

/**
 * Remy sprites are never mirrored: shirt slogans and meme captions are part of the art and would read backwards.
 */
export interface SpriteOpts {
  /** Fill the sprite with one color: undiscovered Remys, shadows. */
  silhouette?: string
}

function drawSprite(x: CanvasRenderingContext2D, sprite: HTMLCanvasElement, dx: number, dy: number, o: SpriteOpts) {
  x.drawImage(sprite, dx, dy)
  if (o.silhouette) {
    x.save()
    x.globalCompositeOperation = 'source-atop'
    x.fillStyle = o.silhouette
    x.fillRect(0, 0, x.canvas.width, x.canvas.height)
    x.restore()
  }
}

/** Full 76×116 sprite canvas (CSS size in rem = 1:1 pixels), drawn as soon as the sprite resolves. */
export function remySprite(idx: number, o: SpriteOpts = {}, cls = 'rs'): HTMLCanvasElement {
  const c = canvas(SPRITE_W, SPRITE_H)
  c.className = cls
  c.setAttribute('aria-hidden', 'true')
  void art.sprite(idx).then((s) => drawSprite(ctx2d(c), s, 0, 0, o))
  return c
}

export interface BustOpts extends SpriteOpts {
  /** Paint a dithered palette backdrop behind the Remy (portraits); omit for transparent icons. */
  backdrop?: boolean
}

/** Eye line and chin rows of every sprite (the collection shares one head mesh; see scripts/quest-art.py). */
const EYE_ROW = 48
const CHIN_ROW = 68

/**
 * Head-and-shoulders crop of a Remy sprite at 1:1, `w`×`h` px, centred on the face. When the whole head fits it hangs
 * from the crown; smaller crops frame forehead-to-chin around the eyes so tiny icons still show a face, not a haircut.
 */
export function remyBust(idx: number, w: number, h: number, o: BustOpts = {}, cls = 'rb'): HTMLCanvasElement {
  const c = canvas(w, h)
  c.className = cls
  c.setAttribute('aria-hidden', 'true')
  const x = ctx2d(c)
  if (o.backdrop) {
    const bg = hex(art.get(idx).palette.bg)
    x.drawImage(ditherRamp(shade(bg, 0.1), shade(bg, -0.45), w, h).toCanvas(), 0, 0)
  }
  void art.sprite(idx).then((s) => {
    const b = spriteBounds(idx, s)
    const dy = h >= CHIN_ROW - b.y0 + 4 ? 2 - b.y0 : Math.round(h * 0.62) - EYE_ROW
    const layer = canvas(w, h)
    drawSprite(ctx2d(layer), s, Math.round(w / 2 - SPRITE_W / 2), dy, o)
    x.drawImage(layer, 0, 0)
  })
  return c
}

/**
 * HTML placeholders for template strings: `<canvas data-remy>` slots filled by `hydrate(root)` after insertion.
 * kind 'sprite' = full body, 'bust' = w×h head crop.
 */
export function remySlot(idx: number, kind: 'sprite' | 'bust', o: BustOpts & { w?: number; h?: number; cls?: string } = {}) {
  const attrs = [
    `data-remy="${idx}"`,
    `data-kind="${kind}"`,
    o.w ? `data-w="${o.w}"` : '',
    o.h ? `data-h="${o.h}"` : '',
    o.backdrop ? 'data-backdrop' : '',
    o.silhouette ? `data-sil="${o.silhouette}"` : '',
    o.cls ? `class="${o.cls}"` : '',
  ]
  return `<canvas ${attrs.filter(Boolean).join(' ')}></canvas>`
}

export function hydrate(root: ParentNode) {
  for (const slot of root.querySelectorAll<HTMLCanvasElement>('canvas[data-remy]')) {
    const idx = Number(slot.dataset.remy)
    const o: BustOpts = { backdrop: 'backdrop' in slot.dataset, silhouette: slot.dataset.sil }
    const cls = slot.className || (slot.dataset.kind === 'sprite' ? 'rs' : 'rb')
    const c =
      slot.dataset.kind === 'sprite'
        ? remySprite(idx, o, cls)
        : remyBust(idx, Number(slot.dataset.w ?? 32), Number(slot.dataset.h ?? 32), o, cls)
    slot.replaceWith(c)
  }
}
