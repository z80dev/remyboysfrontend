import { GOLD, VIS_DOT, dark, goldRidge, greyButton, lcdGrid, light } from './chrome'
import { drawLabel } from './controls'
import { LABEL_FONT, TITLE_FONT, textWidth } from './fonts'
import { type Rgb, Surface, rgb, scale } from './surface'
import { drawTitleText, goldClose, goldDome } from './titlebar'

/**
 * The playlist frame is assembled from tiles repeated in both directions, so every piece uses one flat navy and
 * fixed line colours (no sheen): tiles stay seamless with each other and with the corners.
 */
const BG = rgb(0x2c, 0x2c, 0x45)
const D = dark(BG)
const L = light(BG)
const CHANNEL = scale(BG, 0.8)

type Ridge = [from: number, to: number, open: { left?: boolean; right?: boolean }]

/**
 * A 20px top piece: 14px title bar (rim, lower edge) plus the horizontal groove and the top edge of the list well.
 * `ridge` spans piece-local x; its open ends continue into the neighbouring tile.
 */
function topPiece(s: Surface, x: number, y: number, w: number, active: boolean, ridge: Ridge | null) {
  s.fill(x, y, w, 20, BG)
  s.hline(x, y, w, D)
  s.hline(x, y + 1, w, L)
  s.fill(x, y + 12, w, 2, D)
  s.hline(x, y + 14, w, L)
  s.hline(x, y + 19, w, D)
  if (ridge) goldRidge(s, x + ridge[0], y + 4, ridge[1] - ridge[0], active, ridge[2])
}

/** Left frame columns (12 wide): rim, groove, list edge. Rows are identical, so it tiles vertically. */
function leftFrame(s: Surface, x: number, y: number, h: number) {
  s.fill(x, y, 12, h, BG)
  s.vline(x, y, h, D)
  s.vline(x + 1, y, h, L)
  s.fill(x + 4, y, 2, h, D)
  s.vline(x + 6, y, h, L)
  s.vline(x + 10, y, h, D)
  s.vline(x + 11, y, h, 0)
}

/** Right frame columns (20 wide) from `col` on: list edge, scrollbar channel, groove line, rim. */
function rightFrame(s: Surface, x: number, y: number, h: number, col = 0) {
  const cols: [number, number, Rgb][] = [
    [0, 1, L],
    [4, 1, D],
    [5, 6, CHANNEL],
    [11, 1, L],
    [16, 1, L],
    [19, 1, D],
  ]
  s.fill(x + col, y, 20 - col, h, BG)
  for (const [c, w, color] of cols) if (c >= col) s.fill(x + c, y, w, h, color)
}

/** Bottom strip shared by the bottom tile, corners and visualizer piece (38 tall): list edge, groove, rim. */
function bottomPiece(s: Surface, x: number, y: number, w: number) {
  s.fill(x, y, w, 38, BG)
  s.hline(x, y, w, L)
  s.fill(x, y + 33, w, 2, D)
  s.hline(x, y + 35, w, L)
  s.hline(x, y + 37, w, D)
}

/** Window-shade bar piece (14 tall) with the black title strip running through it. */
function shadePiece(s: Surface, x: number, y: number, w: number) {
  s.fill(x, y, w, 14, BG)
  s.hline(x, y, w, D)
  s.hline(x, y + 1, w, L)
  s.fill(x, y + 12, w, 2, D)
  s.fill(x, y + 3, w, 8, 0)
}

/** Gold vertical scrollbar handle (8×18). */
function scrollHandle(s: Surface, x: number, y: number, pressed: boolean) {
  s.fill(x, y, 8, 18, pressed ? GOLD.dim : GOLD.bright)
  s.bevel(x, y, 8, 18, pressed ? GOLD.dull : 0xfff4c0, GOLD.brown)
  s.fill(x + 2, y + 3, 4, 12, pressed ? GOLD.dull : GOLD.pale)
  s.vline(x + 2, y + 3, 12, GOLD.brown)
  s.vline(x + 5, y + 3, 12, 0xfff4c0)
}

/** A two-line flyout menu button (22×18). */
function menuButton(s: Surface, x: number, y: number, lines: readonly string[], pressed: boolean) {
  greyButton(s, x, y, 23, 19, pressed)
  const o = pressed ? 1 : 0
  const ink: Rgb = pressed ? 0x0a0a12 : 0x1c2838
  const top = lines.length === 1 ? 6 : 3
  lines.forEach((t, k) => {
    drawLabel(s, t, x + o + Math.floor((21 - textWidth(LABEL_FONT, t)) / 2), y + o + top + 6 * k, ink, pressed)
  })
}

const MENUS: readonly { x: number; bar: [number, number]; items: readonly (readonly string[])[] }[] = [
  {
    x: 0,
    bar: [48, 54],
    items: [
      ['ADD', 'URL'],
      ['ADD', 'DIR'],
      ['ADD', 'FILE'],
    ],
  },
  { x: 54, bar: [100, 72], items: [['REM', 'ALL'], ['CROP'], ['REM', 'SEL'], ['REM', 'MISC']] },
  {
    x: 104,
    bar: [150, 54],
    items: [
      ['INV', 'SEL'],
      ['SEL', 'ZERO'],
      ['SEL', 'ALL'],
    ],
  },
  {
    x: 154,
    bar: [200, 54],
    items: [
      ['SORT', 'LIST'],
      ['FILE', 'INF'],
      ['MISC', 'OPTS'],
    ],
  },
  {
    x: 204,
    bar: [250, 54],
    items: [
      ['NEW', 'LIST'],
      ['SAVE', 'LIST'],
      ['LOAD', 'LIST'],
    ],
  },
]

/** PLEDIT.BMP */
export function paintPledit(): Surface {
  const s = new Surface(280, 186)
  for (const [y, active] of [
    [0, true],
    [21, false],
  ] as const) {
    // Top-left corner: the left frame columns run up into the title bar's rim and groove.
    topPiece(s, 0, y, 25, active, [7, 25, { right: true }])
    s.fill(2, y + 12, 2, 8, BG)
    s.vline(0, y + 1, 19, D)
    s.vline(1, y + 2, 18, L)
    s.fill(4, y + 12, 2, 8, D)
    s.vline(6, y + 14, 6, L)
    s.fill(7, y + 19, 3, 1, BG)
    // Title piece.
    topPiece(s, 26, y, 100, active, null)
    const text = 'WINAMP PLAYLIST'
    const tw = textWidth(TITLE_FONT, text)
    const tx = 26 + Math.floor((100 - tw) / 2)
    goldRidge(s, 26, y + 4, tx - 26 - 3, active, { left: true })
    goldRidge(s, tx + tw + 3, y + 4, 126 - (tx + tw + 3), active, { right: true })
    drawTitleText(s, TITLE_FONT, text, tx, y + 4, active)
    // Top tile.
    topPiece(s, 127, y, 25, active, [0, 25, { left: true, right: true }])
    // Top-right corner: right frame columns (corner x 5..24) below the title bar, groove line and rim beside it.
    topPiece(s, 153, y, 25, active, [0, 3, { left: true }])
    goldDome(s, 153 + 5, y + 3, false, active)
    goldClose(s, 153 + 14, y + 3, false, active)
    rightFrame(s, 158, y + 15, 5)
    rightFrame(s, 158, y + 12, 3, 16)
    s.vline(177, y, 12, D)
  }

  leftFrame(s, 0, 42, 29)
  rightFrame(s, 31, 42, 29)
  scrollHandle(s, 52, 53, false)
  scrollHandle(s, 61, 53, true)
  goldClose(s, 52, 42, true)
  goldDome(s, 62, 42, true)
  goldDome(s, 150, 42, true)

  // Shade mode: left end, tile, right end (selected / unselected).
  shadePiece(s, 72, 42, 25)
  s.vline(72, 42, 14, D)
  s.vline(73, 43, 11, L)
  s.fill(74, 45, 2, 8, BG)
  shadePiece(s, 72, 57, 25)
  for (const [y, active] of [
    [42, true],
    [57, false],
  ] as const) {
    shadePiece(s, 99, y, 50)
    s.fill(99 + 30, y + 2, 20, 10, BG)
    for (const k of [0, 2, 4]) s.vline(99 + 22 + k, y + 4 + k, 6 - k, active ? 0xe0e0e8 : 0x8a8a96)
    goldDome(s, 99 + 30, y + 3, false, active)
    goldClose(s, 99 + 40, y + 3, false, active)
    s.vline(99 + 49, y, 14, D)
  }

  // Bottom tile and corners.
  bottomPiece(s, 179, 0, 25)
  bottomPiece(s, 0, 72, 125)
  s.vline(0, 72, 38, D)
  s.vline(1, 72, 37, L)
  s.fill(2, 72, 2, 1, BG)
  s.fill(4, 72, 2, 33, D)
  s.vline(6, 72, 33, L)
  s.fill(7, 72, 3, 1, BG)
  ;['ADD', 'REM', 'SEL', 'MISC'].forEach((label, k) => {
    const x = 11 + 29 * k
    greyButton(s, x, 84, 26, 19, false)
    drawLabel(s, label, x + Math.floor((24 - textWidth(LABEL_FONT, label)) / 2), 90, 0x1c2838)
  })

  bottomPiece(s, 126, 72, 150)
  const bx = 126
  const by = 72
  // Info well, time well.
  s.map(bx + 4, by + 7, 94, 1, dark)
  s.map(bx + 4, by + 8, 1, 11, dark)
  s.fill(bx + 5, by + 8, 92, 10, 0)
  s.map(bx + 5, by + 18, 93, 1, light)
  s.map(bx + 97, by + 7, 1, 12, light)
  s.map(bx + 62, by + 21, 36, 1, dark)
  s.map(bx + 62, by + 22, 1, 9, dark)
  s.fill(bx + 63, by + 22, 34, 9, 0)
  s.map(bx + 62, by + 31, 36, 1, light)
  s.map(bx + 97, by + 21, 1, 11, light)
  s.set(bx + 85, by + 24, 0x00e200)
  s.set(bx + 85, by + 27, 0x00e200)
  // Mini transport.
  const glyphs = [
    ['#..#', '#.##', '####', '#.##', '#..#'],
    ['#...', '###.', '####', '###.', '#...'],
    ['##.##', '##.##', '##.##', '##.##', '##.##'],
    ['####', '####', '####', '####', '####'],
    ['#..#', '##.#', '####', '##.#', '#..#'],
    ['..#..', '.###.', '#####', '.....', '#####'],
  ]
  let gx = bx + 6
  for (const g of glyphs) {
    s.pattern(gx, by + 24, g, { '#': GOLD.bright })
    gx += g[0].length + 4
  }
  // LIST OPTS button.
  greyButton(s, bx + 103, by + 8, 23, 23, false)
  drawLabel(s, 'LIST', bx + 106, by + 12, 0x1c2838)
  drawLabel(s, 'OPTS', bx + 105, by + 19, 0x1c2838)
  // Scroll arrows.
  s.pattern(bx + 135, by + 1, ['...#...', '..###..', '.#####.'], { '#': 0x9a9aae })
  s.pattern(bx + 135, by + 6, ['.#####.', '..###..', '...#...'], { '#': 0x9a9aae })
  // Resize grip.
  for (let j = 0; j < 14; j++) {
    for (let i = 0; i < 14; i++) {
      if (i + j < 13) continue
      const k = (i + j) % 3
      if (k === 0) s.set(bx + 131 + i, by + 19 + j, 0x9a9aae)
      else if (k === 1) s.set(bx + 131 + i, by + 19 + j, 0x14141e)
    }
  }
  // Right frame: the list edge stops at the corner; the groove line and rim run down to the bottom groove.
  s.fill(bx + 131, by, 18, 1, BG)
  s.vline(bx + 146, by, 36, L)
  s.vline(bx + 149, by, 38, D)

  // Visualizer background (sits in the bottom strip between the tiles and the bottom-right corner).
  bottomPiece(s, 205, 0, 75)
  s.fill(205 + 3, 4, 71, 22, lcdGrid(VIS_DOT))
  s.hline(205 + 2, 3, 73, D)
  s.vline(205 + 2, 4, 22, D)
  s.hline(205 + 3, 26, 72, L)
  s.vline(205 + 74, 3, 24, L)
  for (let x = 208; x < 279; x += 2) s.set(x, 24, 0x005284)

  // Flyout menus.
  for (const m of MENUS) {
    m.items.forEach((lines, k) => {
      menuButton(s, m.x, 111 + 19 * k, lines, false)
      menuButton(s, m.x + 23, 111 + 19 * k, lines, true)
    })
    const [bx2, h] = m.bar
    s.fill(bx2, 111, 3, h, 0xdcdce4)
    s.vline(bx2, 111, h, 0x5a5a6a)
    s.vline(bx2 + 2, 111, h, 0x8a8a9a)
  }
  return s
}
