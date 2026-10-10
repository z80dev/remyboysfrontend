import { CHAR_H, CHAR_W, FONT } from '../sprites'
import { BTN, GOLD, VIS_DOT, dark, emboss, greyButton, lcdGrid, sheen } from './chrome'
import { LABEL_FONT, LAMP_FONT, LCD_FONT, drawText, textWidth } from './fonts'
import { type Rgb, Surface, mix, ramp, rgb, scale } from './surface'

/** Green → yellow → orange → red ramp of the volume, balance and EQ bars (t = 0..1). */
export const LEVEL_RAMP: readonly (readonly [number, Rgb])[] = [
  [0, 0x18920b],
  [0.11, 0x69da30],
  [0.33, 0xbde238],
  [0.5, 0xe0da30],
  [0.63, 0xe0b228],
  [0.74, 0xe09228],
  [0.85, 0xe0621e],
  [1, 0xe00e15],
]

/** One shaded row of a level bar: darker top, brighter bottom (`row` 0..3). */
export function levelShade(mid: Rgb, row: number): Rgb {
  if (row === 0) return scale(mid, 0.71, 6)
  if (row === 1) return scale(mid, 0.88)
  if (row === 2) return mid
  return scale(mid, 1, 0x10)
}

const SLOT_BG = 0x383758

/** A 15px volume/balance frame: recessed slot with the coloured bar, `w` wide at (x, y). */
function levelFrame(s: Surface, x: number, y: number, w: number, color: Rgb) {
  s.fill(x, y, w, 14, SLOT_BG)
  s.hline(x + 1, y + 3, w - 4, 0x181725)
  for (let r = 0; r < 4; r++) {
    const c = levelShade(color, r)
    s.hline(x + 2, y + 4 + r, w - 5, c)
    s.set(x, y + 4 + r, 0x1f1f31)
    s.set(x + 1, y + 4 + r, mix(c, 0x1f1f31, 0.5))
    s.set(x + w - 3, y + 4 + r, mix(c, 0x9292a4, 0.5))
  }
  s.hline(x + 1, y + 8, w - 3, 0x7e7e92)
  s.vline(x + w - 3, y + 3, 1, 0x4a4a62)
  s.hline(x, y + 14, w, 0xc8c5d3)
}

/** Grey ribbed slider knob (14×11). `pressed` = dark knob with lit ribs. */
function ribbedThumb(s: Surface, x: number, y: number, pressed: boolean) {
  s.fill(x, y, 14, 11, pressed ? 0x0c0c10 : BTN.face)
  if (!pressed) {
    s.bevel(x, y, 14, 11, BTN.hi, BTN.lo2)
    s.hline(x + 1, y + 9, 12, BTN.lo1)
    s.vline(x + 12, y + 1, 9, BTN.lo1)
  } else {
    s.bevel(x, y, 14, 11, BTN.pressedFace, BTN.pressedHi)
  }
  for (const i of [4, 6, 8]) {
    s.vline(x + i, y + 3, 5, pressed ? 0xf0f0ff : BTN.lo2)
    s.vline(x + i + 1, y + 3, 5, pressed ? 0x606070 : BTN.hi)
  }
}

/** VOLUME.BMP / BALANCE.BMP: 28 level frames and the two knobs. */
export function paintLevels(balance: boolean): Surface {
  const s = new Surface(68, 433)
  const x = balance ? 9 : 0
  const w = balance ? 38 : 68
  for (let f = 0; f < 28; f++) levelFrame(s, x, f * 15, w, ramp(LEVEL_RAMP, f / 27))
  s.fill(0, 420, 68, 2, 0x1c1c2a)
  s.fill(29, 422, 39, 11, 0x1c1c2a)
  ribbedThumb(s, 15, 422, false)
  ribbedThumb(s, 0, 422, true)
  return s
}

/** POSBAR.BMP: seek groove and the two gold thumbs. */
export function paintPosbar(): Surface {
  const s = new Surface(307, 10)
  const body = sheen(124, 58, 0)
  s.fill(0, 0, 248, 10, (x, y) => scale(body(x * 1.1 + 16, y), 0.8))
  s.map(0, 0, 248, 1, dark)
  for (const [x, pressed] of [
    [248, false],
    [278, true],
  ] as const) {
    const face = pressed ? GOLD.dim : GOLD.bright
    s.fill(x, 0, 29, 10, face)
    s.bevel(x, 0, 29, 10, pressed ? GOLD.dim : 0xfff4c0, GOLD.brown)
    s.hline(x + 1, 8, 27, GOLD.dull)
    s.vline(x + 27, 1, 8, GOLD.dull)
    s.fill(x + 4, 3, 21, 4, pressed ? GOLD.dim : GOLD.pale)
    s.hline(x + 4, 3, 21, GOLD.brown)
    s.hline(x + 4, 6, 21, 0xfff4c0)
  }
  return s
}

/** Transport glyphs (embossed on the grey buttons). */
const TRANSPORT: Record<string, { x: number; y: number; mask: string[] }> = {
  prev: {
    x: 4,
    y: 4,
    mask: [
      '###.....##',
      '###....###',
      '###...####',
      '###..#####',
      '###.######',
      '##########',
      '###.######',
      '###..#####',
      '###...####',
      '###....###',
    ],
  },
  play: {
    x: 6,
    y: 4,
    mask: [
      '##.........',
      '####.......',
      '######.....',
      '########...',
      '##########.',
      '##########.',
      '########...',
      '######.....',
      '####.......',
      '##.........',
    ],
  },
  pause: { x: 5, y: 4, mask: Array(10).fill('####....####') },
  stop: { x: 6, y: 4, mask: Array(10).fill('##########') },
  next: {
    x: 6,
    y: 4,
    mask: [
      '##.....###',
      '###....###',
      '####...###',
      '#####..###',
      '######.###',
      '##########',
      '######.###',
      '#####..###',
      '####...###',
      '###....###',
    ],
  },
  eject: {
    x: 5,
    y: 3,
    mask: [
      '.....##.....',
      '....####....',
      '...######...',
      '..########..',
      '.##########.',
      '############',
      '............',
      '############',
      '############',
    ],
  },
}

/** CBUTTONS.BMP */
export function paintCbuttons(): Surface {
  const s = new Surface(136, 36)
  s.fill(0, 0, 136, 36, 0x202033)
  const order = ['prev', 'play', 'pause', 'stop', 'next'] as const
  order.forEach((name, i) => {
    const w = name === 'next' ? 22 : 23
    for (const pressed of [false, true]) {
      const y = pressed ? 18 : 0
      greyButton(s, i * 23, y, w, 18, pressed)
      const g = TRANSPORT[name]
      emboss(s, i * 23 + g.x + (pressed ? 1 : 0), y + g.y + (pressed ? 1 : 0), g.mask, pressed)
    }
  })
  for (const pressed of [false, true]) {
    const y = pressed ? 16 : 0
    greyButton(s, 114, y, 22, 16, pressed)
    const g = TRANSPORT.eject
    emboss(s, 114 + g.x + (pressed ? 1 : 0), y + g.y + (pressed ? 1 : 0), g.mask, pressed)
  }
  return s
}

/** Small lamp on toggle buttons (5×4): dim green when off, bright when on. */
export function lamp(s: Surface, x: number, y: number, on: boolean) {
  s.fill(x, y, 4, 3, on ? 0x00e000 : 0x0f3a10)
  s.hline(x, y, 4, 0x0a1a0a)
  s.vline(x, y, 3, 0x0a1a0a)
  s.set(x + 1, y + 1, on ? 0x80ff80 : 0x1a5a1a)
}

/** Grey toggle button with lamp and a label (or a custom glyph painter). */
export function toggleButton(
  s: Surface,
  x: number,
  y: number,
  w: number,
  h: number,
  pressed: boolean,
  on: boolean,
  label: string | ((x: number, y: number, ink: Rgb) => void),
) {
  greyButton(s, x, y, w, h, pressed)
  const o = pressed ? 1 : 0
  lamp(s, x + 3 + o, y + 3 + o, on)
  const ink = pressed ? 0x0a0a12 : 0x1c2838
  const lx = x + 9 + o
  const ly = y + Math.floor((h - 1 - 5) / 2) + o
  if (typeof label === 'string') drawLabel(s, label, lx, ly, ink, pressed)
  else label(lx, ly, ink)
}

/** Dark label text with a 1px light emboss below-right. */
export function drawLabel(s: Surface, text: string, x: number, y: number, ink: Rgb, pressed = false) {
  drawText(s, LABEL_FONT, text, x + 1, y + 1, pressed ? BTN.pressedHi : BTN.hi)
  drawText(s, LABEL_FONT, text, x, y, ink)
}

/** SHUFREP.BMP: repeat/shuffle (4 states each) and the EQ/PL toggles. */
export function paintShufrep(): Surface {
  const s = new Surface(92, 85)
  s.fill(0, 0, 92, 85, 0x0c0c14)
  const repeatIcon = (x: number, y: number, ink: Rgb) =>
    s.pattern(x, y, ['..#....', '.######', '#.#...#', '#.....#', '.#####.'], { '#': ink })
  for (let k = 0; k < 4; k++) {
    const pressed = k % 2 === 1
    const on = k >= 2
    toggleButton(s, 0, k * 15, 28, 15, pressed, on, repeatIcon)
    toggleButton(s, 28, k * 15, 47, 15, pressed, on, 'SHUFFLE')
  }
  for (const [x, y, pressed, on] of [
    [0, 61, false, false],
    [0, 73, false, true],
    [46, 61, true, false],
    [46, 73, true, true],
  ] as const) {
    toggleButton(s, x, y, 23, 12, pressed, on, 'EQ')
    toggleButton(s, x + 23, y, 23, 12, pressed, on, 'PL')
  }
  return s
}

/** Seven-segment layout of NUMBERS.BMP (9×13 cells). Segments: a top, b upper right, c lower right, d bottom,
 * e lower left, f upper left, g middle. */
const SEGMENTS: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abdeg',
  '3': 'abcdg',
  '4': 'bcfg',
  '5': 'acdfg',
  '6': 'acdefg',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
}

export function paintNumbers(): Surface {
  const s = new Surface(99, 13)
  s.fill(0, 0, 99, 13, lcdGrid(VIS_DOT))
  const green = 0x00f800
  for (let d = 0; d < 10; d++) {
    const x = d * 9
    const seg = SEGMENTS[d]
    const on = (k: string) => seg.includes(k)
    if (on('a')) s.hline(x + 1, 0, 7, green)
    if (on('g')) s.hline(x + 1, 6, 7, green)
    if (on('d')) s.hline(x + 1, 12, 7, green)
    if (on('f')) s.vline(x, 1, 5, green)
    if (on('e')) s.vline(x, 7, 5, green)
    if (on('b')) s.vline(x + 8, 1, 5, green)
    if (on('c')) s.vline(x + 8, 7, 5, green)
    // Joints light up wherever two lit segments meet.
    if (on('f') && on('e')) s.set(x, 6, green)
    if (on('b') && on('c')) s.set(x + 8, 6, green)
    if ((on('f') && on('g')) || (on('e') && on('g'))) s.set(x, 6, green)
    if ((on('b') && on('g')) || (on('c') && on('g'))) s.set(x + 8, 6, green)
  }
  return s
}

/** TEXT.BMP: the green LCD font in 5×6 cells. */
export function paintText(): Surface {
  const s = new Surface(155, 18)
  s.fill(0, 0, 155, 18, 0)
  for (const [ch, [row, col]] of Object.entries(FONT)) {
    const g = LCD_FONT.glyphs[ch]
    if (g && !(ch in { '<': 1, '>': 1, '{': 1, '}': 1 })) s.pattern(col * CHAR_W, row * CHAR_H, g, { '#': 0x00e200 })
  }
  return s
}

/** PLAYPAUS.BMP: play/pause/stop indicators and the working lamp. */
export function paintPlaypaus(): Surface {
  const s = new Surface(42, 9)
  s.fill(0, 0, 42, 9, lcdGrid(VIS_DOT))
  const g = 0x00e800
  s.pattern(3, 0, ['#.....', '##....', '###...', '####..', '#####.', '####..', '###...', '##....', '#.....'], {
    '#': g,
  })
  s.fill(11, 2, 2, 5, g)
  s.fill(14, 2, 3, 5, g)
  s.fill(20, 2, 5, 5, g)
  s.fill(36, 0, 3, 3, g)
  s.fill(36, 6, 3, 3, 0x4e0f00)
  s.fill(39, 0, 3, 3, 0x114033)
  s.fill(39, 6, 3, 3, 0xff2833)
  return s
}

/** MONOSTER.BMP: stereo/mono lamps, lit green with a glow or unlit grey. */
export function paintMonoster(): Surface {
  const s = new Surface(58, 24)
  s.fill(0, 0, 58, 24, (x) => mix(0x2e2d48, 0x25263b, x / 57))
  for (const [lit, y] of [
    [true, 0],
    [false, 12],
  ] as const) {
    for (const [text, x, w] of [
      ['stereo', 0, 29],
      ['mono', 29, 27],
    ] as const) {
      const tx = x + Math.floor((w - textWidth(LAMP_FONT, text)) / 2)
      if (lit) {
        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ])
          drawText(s, LAMP_FONT, text, tx + dx, y + 3 + dy, rgb(0x1c, 0x6a, 0x34))
        drawText(s, LAMP_FONT, text, tx, y + 3, 0x00ff00)
      } else {
        drawText(s, LAMP_FONT, text, tx, y + 3, 0x8a8a96)
      }
    }
  }
  return s
}
