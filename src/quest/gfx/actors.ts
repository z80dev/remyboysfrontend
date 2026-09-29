/**
 * Chibi Remy-style characters (16×24: big round head, huge anime eyes, tiny body) composed from string templates:
 * head + face + hair + body + accessory, recolored from `ActorLook`, cached per look/dir/frame. Also: shadow,
 * emote bubbles, tall-grass front blades, grass rustle / ledge dust effects, and the ground item pickup.
 */
import type { ActorLook, Dir, Emote, Theme } from '../types'
import { BASE, PALS } from './palette'
import { type Col, Px, css, hex, mix, shade, stamp, withAlpha } from './px'
import { tallFront, tallVariant } from './tiles'

// ---------------------------------------------------------------------------------------------------------------
// Templates. Chars: o outline, h/s/S skin light/base/shade, P lash/pupil, W eye glint, i/I iris, e eye white,
// b brow, m mouth, k blush, q/R/r/H hair outline/dark/base/light, t/T/y shirt base/shade/light, l/L pants, f shoes.

const HEAD_FRONT = [
  '................',
  '................',
  '.....oooooo.....',
  '...oohhhsssoo...',
  '..ohhhssssssSo..',
  '.ohhsssssssssSo.',
  '.ohssssssssssSo.',
  '.osssssssssssSo.',
  '.osssssssssssSo.',
  '.osssssssssssSo.',
  '.osssssssssssSo.',
  '..osssssssssSo..',
  '...oosssssSoo...',
  '.....oooooo.....',
]

const FACE_DOWN = [
  '',
  '',
  '',
  '',
  '',
  '',
  '...bbb....bbb...',
  '......b..b......',
  '....PP....PP....',
  '...PWiP..PWiP...',
  '...PiIP..PiIP...',
  '...kPP....PPk...',
  '.......mm.......',
]

const FACE_RIGHT = [
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '.........bbb....',
  '..........PP....',
  '.....SS..PWiP...',
  '.....S...PiIP...',
  '..........PPk...',
  '..........m.....',
]

interface HairDef {
  /** DOWN view rows (from row 0). */
  down: string[]
  /** RIGHT view rows (from row 0). */
  right: string[]
  /** UP view uses `down` rows < upSplit, then fills the head down to `backTo`. */
  upSplit: number
  backTo: number
}

const HAIR: Record<Exclude<ActorLook['hair'], 'bald'>, HairDef> = {
  short: {
    down: [
      '',
      '',
      '.....qqqqqq.....',
      '...qqHHHrrrqq...',
      '..qHHrrrrrrrRq..',
      '.qHrrrrrrrrrrRq.',
      '.qrrRq.qrq.qRrq.',
      '.qR..........Rq.',
      '.q............q.',
    ],
    right: [
      '',
      '',
      '.....qqqqqq.....',
      '...qqHHHrrrqq...',
      '..qHrrrrrrrrrq..',
      '.qrrrrrrrrrrrRq.',
      '.qrrrrrrRq.qrRq.',
      '.qrrrrrq.....qq.',
      '.qrrrrq.........',
      '.qRrrq..........',
      '.qRRq...........',
    ],
    upSplit: 6,
    backTo: 11,
  },
  spiky: {
    down: [
      '...q...q..q...q.',
      '..qrq.qrqqrq.qrq',
      '..qHrqrHrrHrqrRq',
      '..qHHrrrrrrrrRq.',
      '.qHHrrrrrrrrrRq.',
      '.qHrrrrrrrrrrrRq',
      '.qrRrRq.qRrRrRq.',
      '.qR.q......q.Rq.',
      '.q............q.',
    ],
    right: [
      '..q..q...q......',
      '.qrqqrq.qrq.....',
      '.qrHrHrqrHrqq...',
      'qrrHHrrrrrrrrq..',
      '.qrrrrrrrrrrrrq.',
      'qrrrrrrrrrrrrrRq',
      '.qrrrrrrRq.qRrRq',
      '.qrrrrrq....qRq.',
      'qrrrrrq.........',
      '.qRrrq..........',
      '..qqq...........',
    ],
    upSplit: 6,
    backTo: 11,
  },
  long: {
    down: [
      '',
      '',
      '.....qqqqqq.....',
      '...qqHHHrrrqq...',
      '..qHHrrrrrrrRq..',
      '.qHrrrrrrrrrrRq.',
      '.qrrRrrqqrrRrRq.',
      'qrrq........qRRq',
      'qrrq........qRRq',
      'qrrq........qRRq',
      'qrrq........qRRq',
      'qrRq........qRRq',
      'qrRq........qRRq',
      'qRRq........qRRq',
      'qRRq........qRRq',
      'qRRq........qRRq',
      '.qq..........qq.',
    ],
    right: [
      '',
      '',
      '.....qqqqqq.....',
      '...qqHHHrrrqq...',
      '..qHrrrrrrrrrq..',
      '.qrrrrrrrrrrrRq.',
      '.qrrrrrrrRqrrRq.',
      'qrrrrrrq....qRq.',
      'qrrrrrq.........',
      'qrrrrrq.........',
      'qrrrrrq.........',
      'qrRrrrq.........',
      'qrRrrq..........',
      'qRRrrq..........',
      'qRRRrq..........',
      'qRRRq...........',
      '.qqq............',
    ],
    upSplit: 6,
    backTo: 16,
  },
  cap: {
    down: [
      '.......qq.......',
      '.....qqHHqq.....',
      '...qqHHrrrrqq...',
      '..qHHrrZZrrrRq..',
      '.qHrrrrrrrrrrRq.',
      '.qqqqqqqqqqqqqq.',
      '.qRRRRRRRRRRRRq.',
      '..qqqqqqqqqqqq..',
    ],
    right: [
      '.......qq.......',
      '.....qqHHqq.....',
      '...qqHHrrrrqq...',
      '..qHrrrrrrZrrq..',
      '.qrrrrrrrrrrrRq.',
      '.qqqqqqqqqqqqqqq',
      '.qRRrq.qRRRRRRRq',
      '.qRRq...qqqqqqq.',
      '.qRq............',
    ],
    upSplit: 5,
    backTo: 10,
  },
  beanie: {
    down: [
      '.......qq.......',
      '......qHHq......',
      '.....qqrrqq.....',
      '...qqHrrrrRqq...',
      '..qHrRrRrRrRRq..',
      '.qHrRrRrRrRrRRq.',
      '.qHHHHHHHHHHHHq.',
      '.qrrrrrrrrrrrRq.',
      '..qqqqqqqqqqqq..',
    ],
    right: [
      '.....qq.........',
      '....qHHq........',
      '.....qqrqq......',
      '...qqHrrrrRqq...',
      '..qHrRrRrRrRrq..',
      '.qrRrRrRrRrRrRq.',
      '.qHHHHHHHHHHHHq.',
      '.qrrrrrrrrrrrRq.',
      '.qRq.qqqqqqqqq..',
      '.qRq............',
    ],
    upSplit: 6,
    backTo: 10,
  },
  afro: {
    down: [
      '....qqqqqqqq....',
      '..qqHHHrrrrrqq..',
      '.qHHHrrrrrrrrRq.',
      'qHHrrrrrrrrrrrRq',
      'qHrrrrrrrrrrrrRq',
      'qrrrrrrrrrrrrRRq',
      'qrRrRq.qRq.qRRRq',
      'qRRq........qRRq',
      '.qRq........qRq.',
      '..q..........q..',
    ],
    right: [
      '....qqqqqqqq....',
      '..qqHHHrrrrrqq..',
      '.qHHHrrrrrrrrRq.',
      'qHHrrrrrrrrrrrRq',
      'qHrrrrrrrrrrrrRq',
      'qrrrrrrrrrrrrRRq',
      'qrrrrrrrrRq.qRRq',
      'qrrrrrrq....qRq.',
      'qrRrrrq......q..',
      'qRRrrq..........',
      '.qRRq...........',
      '..qq............',
    ],
    upSplit: 7,
    backTo: 12,
  },
  bun: {
    down: [
      '......qqqq......',
      '.....qHHrRq.....',
      '.....qqrRqq.....',
      '...qqHHHrrrqq...',
      '..qHHrrrrrrrRq..',
      '.qHrrrrrrrrrrRq.',
      '.qrrRq....qRrrq.',
      '.qR..........Rq.',
      '.q............q.',
    ],
    right: [
      '..qqqq..........',
      '.qHHrRq.........',
      '.qqrRqqqqq......',
      '...qqHHHrrrqq...',
      '..qHrrrrrrrrrq..',
      '.qrrrrrrrrrrrRq.',
      '.qrrrrrrrRq.qRq.',
      '.qrrrrrq.....qq.',
      '.qrrrrq.........',
      '.qRrrq..........',
      '..qqq...........',
    ],
    upSplit: 6,
    backTo: 11,
  },
}

const BODY_DOWN_STAND = [
  '...otttTTttto...',
  '..oTyttttttTTo..',
  '..oTyttttttTTo..',
  '..osottttttoSo..',
  '..osoTttttToSo..',
  '...oolllllloo...',
  '....ollLLllo....',
  '....olloollo....',
  '....offooffo....',
  '.....oo..oo.....',
]
/** Rows 0..5 of the torso reused while stepping (shifted down 1); these are the 3 leg rows below it. */
const LEGS_DOWN_STEP = ['....ollooffo....', '....offo.oo.....', '.....oo.........']

const BODY_RIGHT_STAND = [
  '....otttttto....',
  '....oyytTtto....',
  '....oyytTtto....',
  '....oyytTtto....',
  '....oTTtsTTo....',
  '.....olllLo.....',
  '.....olllLo.....',
  '.....olllLo.....',
  '.....offfffo....',
  '.....ooooooo....',
]
const BODY_RIGHT_STEP_A_TOP = [
  '....otttttto....',
  '....oyyttTTo....',
  '....oyyttTTo....',
  '....oyytttTso...',
  '....oTTttTTo....',
  '.....olllLo.....',
]
const BODY_RIGHT_STEP_B_TOP = [
  '....otttttto....',
  '....oTTyttto....',
  '...oTTyttttTo...',
  '...osTyyttTo....',
  '....oTTttTTo....',
  '.....olllLo.....',
]
const LEGS_RIGHT_STEP = ['....oLLo.ollo...', '...offo..offfo..', '...ooo...oooo...']
const LEGS_RIGHT_STEP_B = ['....ollo.oLLo...', '...offo..offfo..', '...ooo...oooo...']

// Accessory overlays (rows relative to sprite row 0 for face, body row 0 for body).
const GLASSES_DOWN = ['', '', '', '', '', '', '', '', '...gggg..gggg...', '..g....gg....g..', '', '...gggg..gggg...']
const GLASSES_RIGHT = ['', '', '', '', '', '', '', '', '.........gggg...', '......ggg....g..', '', '.........gggg...']
const SHADES_DOWN = ['', '', '', '', '', '', '', '', '...gggg..gggg...', '..gxWxxggxWxxg..', '...xxxx..xxxx...', '...gxxg..gxxg...']
const SHADES_RIGHT = ['', '', '', '', '', '', '', '', '.........gggg...', '......gggxWxxg..', '.........xxxx...', '.........gxxg...']
const CHAIN_DOWN = ['', '....G......G....', '.....G....G.....', '......GGGG......', '.......Gc.......']
const CHAIN_RIGHT = ['', '.........G......', '..........G.....', '.........Gc.....']

type Pal = Record<string, Col>

const OUTLINE = hex('#1e1420')
const EYE_IRIS = hex('#2e63e6')
const EYE_DARK = hex('#15245e')

function lookPal(look: ActorLook): Pal {
  const skin = hex(look.skin)
  const hair = hex(look.hairColor)
  let shirt = hex(look.shirt)
  let pants = hex(look.pants)
  if (look.extra === 'suit') {
    shirt = hex('#262635')
    pants = hex('#1c1c28')
  }
  if (look.extra === 'coat') shirt = hex('#f4f6fa')
  return {
    o: OUTLINE,
    h: shade(skin, 0.28),
    s: skin,
    S: shade(skin, -0.22),
    k: mix(skin, hex('#ff6a7a'), 0.35),
    P: hex('#161020'),
    W: hex('#ffffff'),
    i: EYE_IRIS,
    I: EYE_DARK,
    e: hex('#ffffff'),
    b: mix(OUTLINE, hair, 0.25),
    m: hex('#6a2030'),
    q: shade(hair, -0.62),
    R: shade(hair, -0.25),
    r: hair,
    H: shade(hair, 0.3),
    t: shirt,
    T: shade(shirt, -0.24),
    y: shade(shirt, 0.3),
    l: pants,
    L: shade(pants, -0.3),
    f: hex('#2a2230'),
    g: hex('#2a1e2a'),
    x: hex('#10101a'),
    G: hex('#ffcf3a'),
    c: hex('#fff3b0'),
    Z: hex('#ffffff'),
  }
}

/** Fills the back of the head (rows from..to) with hair for up/side views. */
function fillBackHair(p: Px, pal: Pal, from: number, to: number, maxX: number, dy: number): void {
  for (let y = from; y <= to; y++) {
    const row = HEAD_FRONT[y] ?? ''
    for (let x = 0; x < 16 && x <= maxX; x++) {
      const ch = row[x]
      if (ch === 'o') p.set(x, y + dy, pal.q)
      else if (ch && ch !== '.') p.set(x, y + dy, x <= 3 || (x <= 5 && y === from) ? pal.H : x >= 12 || y === to ? pal.R : pal.r)
    }
  }
}

function compose(look: ActorLook, dir: Dir, step: number): Px {
  const pal = lookPal(look)
  const p = new Px(16, 24)
  const flip = dir === 'left'
  const view = dir === 'left' ? 'right' : dir
  const dy = step ? 1 : 0
  const hair = look.hair === 'bald' ? undefined : HAIR[look.hair]
  const e = look.extra

  // --- body
  const bodyPal = { ...pal }
  if (view === 'down' || view === 'up') {
    const top = BODY_DOWN_STAND.slice(0, 6)
    stamp(p, top, 0, 14 + dy, bodyPal)
    if (!step) stamp(p, BODY_DOWN_STAND.slice(6), 0, 20, bodyPal)
    else stamp(p, LEGS_DOWN_STEP, 0, 21, bodyPal, step === 2)
  } else {
    if (!step) stamp(p, BODY_RIGHT_STAND, 0, 14, bodyPal)
    else {
      stamp(p, step === 1 ? BODY_RIGHT_STEP_A_TOP : BODY_RIGHT_STEP_B_TOP, 0, 15, bodyPal)
      stamp(p, step === 1 ? LEGS_RIGHT_STEP : LEGS_RIGHT_STEP_B, 0, 21, bodyPal)
    }
  }
  // accessories on the body
  const by = 14 + dy
  if (e === 'coat' || e === 'suit') {
    const inner = e === 'coat' ? hex(look.shirt) : hex('#ffffff')
    if (view === 'down') {
      for (let y = 0; y < 5; y++) {
        p.set(7, by + y, inner)
        p.set(8, by + y, e === 'suit' && y < 4 ? (y === 0 ? hex('#1e3a8a') : BASE[2]) : shade(inner, -0.15))
        if (e === 'suit' && y < 4) p.set(7, by + y, y === 0 ? inner : BASE[2])
      }
      p.set(6, by + 1, shade(pal.t, -0.3))
      p.set(9, by + 1, shade(pal.t, -0.3))
      if (e === 'coat') {
        // coat tails over the thighs
        p.set(4, by + 6, pal.o)
        p.set(5, by + 6, pal.T)
        p.set(10, by + 6, pal.T)
        p.set(11, by + 6, pal.o)
        p.set(4, by + 5, pal.t)
        p.set(11, by + 5, pal.t)
      }
    } else if (view === 'right') {
      p.set(10, by + 1, inner)
      p.set(10, by + 2, e === 'suit' ? BASE[2] : inner)
      if (e === 'coat') {
        p.set(5, by + 5, pal.t)
        p.set(5, by + 6, pal.T)
        p.set(4, by + 6, pal.o)
        p.set(4, by + 5, pal.o)
      }
    } else if (e === 'coat') {
      p.hl(5, by + 5, 6, pal.t)
      p.hl(5, by + 6, 6, pal.T)
      p.set(4, by + 5, pal.o)
      p.set(11, by + 5, pal.o)
      p.set(4, by + 6, pal.o)
      p.set(11, by + 6, pal.o)
    }
  }
  if (e === 'chain') {
    if (view === 'down') stamp(p, CHAIN_DOWN, 0, by - 1, pal)
    else if (view === 'right') stamp(p, CHAIN_RIGHT, 0, by - 1, pal)
  }

  // --- head
  const head = new Px(16, 24)
  stamp(head, HEAD_FRONT, 0, dy, pal)
  if (view === 'down') {
    stamp(head, FACE_DOWN, 0, dy, pal)
    if (hair) stamp(head, hair.down, 0, dy, pal)
    if (e === 'glasses') stamp(head, GLASSES_DOWN, 0, dy, pal)
    if (e === 'shades') stamp(head, SHADES_DOWN, 0, dy, pal)
  } else if (view === 'right') {
    stamp(head, FACE_RIGHT, 0, dy, pal)
    if (hair) {
      fillBackHair(head, pal, 6, hair.backTo, 5, dy)
      stamp(head, hair.right, 0, dy, pal)
    }
    if (e === 'glasses') stamp(head, GLASSES_RIGHT, 0, dy, pal)
    if (e === 'shades') stamp(head, SHADES_RIGHT, 0, dy, pal)
  } else {
    if (!hair) {
      // back-of-head sheen + nape shading
      head.hl(4, 12 + dy, 8, pal.S)
      head.set(5, 4 + dy, pal.h)
      head.set(6, 3 + dy, pal.h)
    } else {
      stamp(head, hair.down.slice(0, hair.upSplit), 0, dy, { ...pal, Z: pal.r })
      fillBackHair(head, pal, hair.upSplit, hair.backTo, 15, dy)
      if (look.hair === 'long') {
        stamp(head, hair.down.slice(7), 0, 7 + dy, { ...pal, '.': 0 })
        fillBackHair(head, pal, 7, 12, 15, dy)
        for (let y = 13; y <= 15; y++) head.hl(3, y + dy, 10, y === 15 ? pal.q : pal.R)
        head.set(2, 15 + dy, pal.q)
        head.set(13, 15 + dy, pal.q)
      }
      if (look.hair === 'bun') head.rect(6, dy, 4, 3, pal.r)
    }
    if (e === 'glasses' || e === 'shades') {
      head.set(1, 9 + dy, pal.g)
      head.set(14, 9 + dy, pal.g)
    }
  }
  p.blit(head, 0, 0)

  if (flip) {
    const q = new Px(16, 24)
    q.blit(p, 0, 0, true)
    return q
  }
  return p
}

const actorCache = new Map<string, HTMLCanvasElement>()

function actorSprite(look: ActorLook, dir: Dir, frame: number): HTMLCanvasElement {
  const step = frame === 1 ? 1 : frame === 3 ? 2 : 0
  const key = `${look.skin}|${look.hair}|${look.hairColor}|${look.shirt}|${look.pants}|${look.extra ?? ''}|${dir}|${step}`
  let c = actorCache.get(key)
  if (!c) {
    c = compose(look, dir, step).toCanvas()
    actorCache.set(key, c)
  }
  return c
}

export function drawActor(ctx: CanvasRenderingContext2D, look: ActorLook, dir: Dir, frame: number, px: number, py: number): void {
  ctx.drawImage(actorSprite(look, dir, frame & 3), px | 0, (py | 0) - 8)
}

// ---------------------------------------------------------------------------------------------------------------
// Shadow + small effects

let shadowImg: HTMLCanvasElement | undefined
export function drawShadow(ctx: CanvasRenderingContext2D, px: number, py: number): void {
  if (!shadowImg) {
    const p = new Px(14, 5)
    p.ellipse(7, 2.5, 6.5, 2.2, withAlpha(hex('#1a1030'), 70))
    p.ellipse(7, 2.5, 4.5, 1.4, withAlpha(hex('#1a1030'), 40))
    shadowImg = p.toCanvas()
  }
  ctx.drawImage(shadowImg, (px | 0) + 1, (py | 0) + 12)
}

/** Shared per-frame state from drawAnimated (camera + theme) so fronts/rustles line up with the tiles. */
export const frameState = { camX: 0, camY: 0, theme: 'town' as Theme }

export function drawTallGrassFront(ctx: CanvasRenderingContext2D, px: number, py: number, t: number): void {
  const tx = Math.floor((px + frameState.camX) / 16)
  const ty = Math.floor((py + frameState.camY) / 16)
  ctx.drawImage(tallFront(frameState.theme, grassLean(tx, ty, t), tallVariant(tx, ty)), px | 0, py | 0)
}

/** Gentle wind wave rolling across tall grass: -1/0/1 lean per tile. */
export function grassLean(tx: number, ty: number, t: number): number {
  const s = Math.sin(t * 1.9 - tx * 0.55 - ty * 0.3)
  return s > 0.72 ? 1 : s < -0.9 ? -1 : 0
}

export function drawGrassRustle(ctx: CanvasRenderingContext2D, px: number, py: number, t: number): void {
  if (t < 0 || t > 0.35) return
  const pal = PALS[frameState.theme].tall
  const k = t / 0.35
  const leaves = [
    [-9, -15],
    [8, -17],
    [-12, -8],
    [12, -9],
    [-3, -20],
    [4, -12],
  ]
  const light = css(pal[3])
  const base = css(pal[2])
  const dark = css(pal[0])
  ctx.globalAlpha = k > 0.75 ? (1 - k) * 4 : 1
  for (let i = 0; i < leaves.length; i++) {
    const [vx, vy] = leaves[i]
    const x = Math.round(px + 7 + vx * k)
    const y = Math.round(py + 10 + vy * k + 26 * k * k)
    const flip = (Math.floor(t * 24) + i) % 2 === 0
    // fluttering leaf: horizontal (lit) ↔ vertical (edge-on) every other frame
    ctx.fillStyle = i % 2 ? light : base
    if (flip) ctx.fillRect(x, y, 3, 1)
    else ctx.fillRect(x + 1, y - 1, 1, 2)
    ctx.fillStyle = dark
    if (flip) ctx.fillRect(x + 1, y + 1, 1, 1)
    else ctx.fillRect(x + 2, y, 1, 1)
  }
  ctx.globalAlpha = 1
}

const puffCache: HTMLCanvasElement[] = []
/** Crisp dust puff of radius r (1..3): cream ball with a warm shaded underside. */
function puff(r: number): HTMLCanvasElement {
  if (!puffCache[r]) {
    const p = new Px(r * 2 + 1, r * 2 + 1)
    p.ellipse(r + 0.5, r + 0.5, r + 0.4, r + 0.4, (_x, y) => (y > r ? hex('#d8c8a4') : hex('#fbf4e2')))
    puffCache[r] = p.toCanvas()
  }
  return puffCache[r]
}

export function drawLedgeDust(ctx: CanvasRenderingContext2D, px: number, py: number, t: number): void {
  if (t < 0 || t > 0.3) return
  const k = t / 0.3
  const x0 = (px | 0) + 8
  const y0 = (py | 0) + 13
  ctx.globalAlpha = k > 0.6 ? (1 - k) * 2.5 : 1
  for (const side of [-1, 1]) {
    const big = k < 0.25 ? 2 : k < 0.7 ? 3 : 2
    const bx = x0 + side * Math.round(3 + k * 7)
    const by = y0 - Math.round(k * 3)
    ctx.drawImage(puff(big), bx - big, by - big)
    const small = k < 0.5 ? 1 : 2
    const sx = x0 + side * Math.round(1 + k * 3)
    ctx.drawImage(puff(small), sx - small, y0 - Math.round(k * 5) - small)
  }
  ctx.globalAlpha = 1
}

// ---------------------------------------------------------------------------------------------------------------
// Emotes

const BUBBLE = [
  '..oooooooooo..',
  '.owwwwwwwwwwo.',
  'owwwwwwwwwwwwo',
  'owwwwwwwwwwwwo',
  'owwwwwwwwwwwwo',
  'owwwwwwwwwwwwo',
  'owwwwwwwwwwwwo',
  'owwwwwwwwwwwwo',
  'owwwwwwwwwwwwo',
  '.owwwwwwwwwwso',
  '..oooowwooooo.',
  '.....owo......',
  '......o.......',
]

const EMOTE_ART: Record<Emote, string[]> = {
  alert: ['..rr..', '..rr..', '..rr..', '..rR..', '..RR..', '......', '..rr..'],
  question: ['.bbbb.', 'bB..bb', '....bb', '...bB.', '..bB..', '......', '..bb..'],
  heart: ['.rr.rr.', 'rwrrrrR', 'rrrrrrR', '.rrrrR.', '..rrR..', '...R...'],
  dots: [],
  note: ['...nnn', '...n.n', '...n.n', '...n..', '.nnn..', 'nnnn..', '.nn...'],
}

const emoteCache = new Map<string, HTMLCanvasElement>()
function emoteSprite(emote: Emote, dots: number): HTMLCanvasElement {
  const key = `${emote}|${dots}`
  let c = emoteCache.get(key)
  if (!c) {
    const p = new Px(14, 13)
    stamp(p, BUBBLE, 0, 0, { o: OUTLINE, w: hex('#ffffff'), s: hex('#d8dce8') })
    const pal = {
      r: hex('#e8303a'),
      R: hex('#a01828'),
      w: hex('#ffd0d4'),
      b: hex('#2e63e6'),
      B: hex('#15245e'),
      n: hex('#3a2a6a'),
    }
    if (emote === 'dots') {
      for (let i = 0; i < dots; i++) {
        p.rect(3 + i * 3, 5, 2, 2, hex('#3a3a4a'))
        p.set(3 + i * 3, 5, hex('#6a6a7a'))
      }
    } else {
      const art = EMOTE_ART[emote]
      const w = art[0].length
      stamp(p, art, 7 - Math.ceil(w / 2), 2, pal)
    }
    c = p.toCanvas()
    emoteCache.set(key, c)
  }
  return c
}

export function drawEmote(ctx: CanvasRenderingContext2D, emote: Emote, px: number, py: number, t: number): void {
  const dots = emote === 'dots' ? Math.min(3, 1 + Math.floor(Math.max(0, t) * 3) % 4) : 0
  const img = emoteSprite(emote, dots)
  const scale = t < 0.04 ? 0.35 : t < 0.08 ? 0.7 : t < 0.13 ? 1.2 : 1
  const bob = t > 0.13 && t < 0.24 ? -1 : 0
  const w = Math.round(14 * scale)
  const h = Math.round(13 * scale)
  const bx = (px | 0) + 8 - (w >> 1) + (scale === 1 ? 1 : 0)
  const by = (py | 0) - 7 - h + bob
  ctx.drawImage(img, bx, by, w, h)
}

// ---------------------------------------------------------------------------------------------------------------
// Item pickup: tiny Base-blue hardware wallet with a glint and periodic sparkle

let itemImg: HTMLCanvasElement | undefined
export function drawItemBall(ctx: CanvasRenderingContext2D, px: number, py: number, t: number): void {
  if (!itemImg) {
    const p = new Px(16, 16)
    p.ellipse(8, 13.5, 6, 1.6, withAlpha(hex('#1a1030'), 70))
    const s = new Px(16, 16)
    // swivel cover (steel) + body (Base blue)
    s.rect(3, 6, 10, 6, BASE[2])
    s.hl(3, 6, 10, BASE[4])
    s.hl(3, 11, 10, BASE[1])
    s.vl(3, 6, 6, BASE[3])
    s.rect(4, 8, 5, 2, hex('#071030'))
    s.set(5, 8, hex('#7cf0ff'))
    s.set(6, 8, hex('#7cf0ff'))
    s.set(7, 9, hex('#3ab0ff'))
    s.rect(10, 7, 2, 4, hex('#d8dce8'))
    s.set(10, 7, hex('#ffffff'))
    s.set(11, 10, hex('#8a90a0'))
    s.outline(OUTLINE)
    p.blit(s, 0, 0)
    itemImg = p.toCanvas()
  }
  const x = px | 0
  const y = py | 0
  ctx.drawImage(itemImg, x, y)
  // glint sweeping across the body
  const g = (t * 0.8) % 2
  if (g < 0.5) {
    const gx = x + 4 + Math.floor(g * 16)
    if (gx < x + 12) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.fillRect(gx, y + 6, 1, 1)
      ctx.fillRect(gx - 1, y + 7, 1, 1)
    }
  }
  // sparkle
  const s = (t * 0.7) % 1.6
  if (s < 0.3) {
    const r = s < 0.1 || s > 0.2 ? 1 : 2
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x + 13, y + 3 - r, 1, r * 2 + 1)
    ctx.fillRect(x + 13 - r, y + 3, r * 2 + 1, 1)
    ctx.fillStyle = '#8cb4ff'
    if (r === 2) {
      ctx.fillRect(x + 12, y + 2, 1, 1)
      ctx.fillRect(x + 14, y + 4, 1, 1)
    }
  }
}
