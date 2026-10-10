import { type Rgb, type Shader, type Surface, mix, rgb, scale } from './surface'

/**
 * Shared look of the base skin: the navy sheen behind every window, engraved lines, the grey push-buttons with
 * embossed glyphs, the gold title-bar ridges and the small gold window buttons.
 */

/** Window body colour: a dark navy with a broad lighter diagonal band through the middle-right. */
export function sheen(cx = 165, cy = 58, tilt = 0.35): Shader {
  return (x, y) => {
    const d = Math.abs(x - cx + tilt * (y - cy))
    const v = Math.max(0x10, 0x39 - 0.2 * Math.max(0, d - 12))
    return rgb(v, v, v * 1.58)
  }
}

/** Highlight/shadow lines are derived from the colour underneath so they follow the sheen. */
export const light = (c: Rgb) => scale(c, 0.62, 0x50)
export const dark = (c: Rgb) => scale(c, 0.7)

/** Engraved frame line: a 2px shadow outline and a 1px light outline offset by (2,2) inside it. */
export function groove(s: Surface, x: number, y: number, w: number, h: number) {
  for (const k of [0, 1]) {
    s.map(x + k, y + k, w - 1 - 2 * k, 1, dark)
    s.map(x + k, y + h - 2 - k, w - 1 - 2 * k, 1, dark)
    s.map(x + k, y + k + 1, 1, h - 3 - 2 * k, dark)
    s.map(x + w - 2 - k, y + k + 1, 1, h - 3 - 2 * k, dark)
  }
  s.map(x + 2, y + 2, w - 2, 1, light)
  s.map(x + 2, y + h - 1, w - 2, 1, light)
  s.map(x + 2, y + 3, 1, h - 4, light)
  s.map(x + w - 1, y + 3, 1, h - 4, light)
}

/** The 275×116 window body shared by MAIN and EQMAIN: navy sheen, outer rim and the engraved inner frame. */
export function windowBody(s: Surface) {
  s.fill(0, 0, 275, 116, sheen())
  s.map(0, 0, 275, 1, dark)
  s.map(0, 1, 1, 115, dark)
  s.map(1, 1, 273, 1, light)
  s.map(1, 2, 1, 113, light)
  s.map(274, 1, 1, 115, dark)
  s.map(1, 115, 274, 1, dark)
  groove(s, 4, 12, 268, 101)
}

/** Sunken LCD well: shaded top/left edge, light bottom/right edge, black (or `inside`) within. */
export function well(s: Surface, x: number, y: number, w: number, h: number, inside: Rgb | Shader = 0) {
  s.map(x, y, w - 1, 1, dark)
  s.map(x, y + 1, 1, h - 2, dark)
  s.map(x, y + h - 1, w, 1, light)
  s.map(x + w - 1, y, 1, h, light)
  s.fill(x + 1, y + 1, w - 2, h - 2, inside)
}

/** LCD dot grid: dim dots on even pixels (relative to `ox,oy`) over black. */
export function lcdGrid(dot: Rgb, ox = 0, oy = 0): Shader {
  return (x, y) => ((x - ox) % 2 === 0 && (y - oy) % 2 === 0 ? dot : 0)
}

export const VIS_DOT = 0x182129

// Grey push-buttons (transport, shuffle/repeat, EQ/PL toggles, ON/AUTO, playlist flyouts).
export const BTN = {
  rim: 0xadb5c6,
  hi: 0xefffff,
  face: 0xbdced6,
  lo1: 0x7b8494,
  lo2: 0x4a5a6b,
  glyph: 0x97a8b9,
  pressedEdge: 0x080810,
  pressedFace: 0x7b8c9c,
  pressedHi: 0xadbdc6,
  pressedGlyph: 0x4a5a6b,
}

/**
 * A grey bevelled button occupying (w-1)×(h-1) of the cell (the last row/column stay as they are, like the gaps
 * between the original buttons). Pressed buttons are sunk into a black recess.
 */
export function greyButton(s: Surface, x: number, y: number, w: number, h: number, pressed: boolean) {
  const bw = w - 1
  const bh = h - 1
  if (!pressed) {
    s.fill(x, y, bw, bh, BTN.face)
    s.hline(x, y, bw, BTN.rim)
    s.vline(x, y, bh, BTN.rim)
    s.hline(x + 1, y + 1, bw - 4, BTN.hi)
    s.vline(x + 1, y + 1, bh - 4, BTN.hi)
    s.hline(x + 1, y + bh - 3, bw - 3, BTN.rim)
    s.vline(x + bw - 3, y + 1, bh - 3, BTN.rim)
    s.hline(x + 1, y + bh - 2, bw - 2, BTN.lo1)
    s.vline(x + bw - 2, y + 1, bh - 2, BTN.lo1)
    s.hline(x, y + bh - 1, bw, BTN.lo2)
    s.vline(x + bw - 1, y, bh, BTN.lo2)
    s.set(x, y + bh - 1, BTN.lo1)
    s.set(x + bw - 1, y, BTN.lo1)
  } else {
    s.fill(x, y, w, h, BTN.pressedEdge)
    s.fill(x + 2, y + 2, w - 3, h - 3, BTN.pressedFace)
    s.hline(x + 3, y + 3, w - 5, BTN.pressedHi)
    s.vline(x + 3, y + 3, h - 6, BTN.pressedHi)
  }
}

/** Glyph mask: rows of `#`. Rendered engraved: shadow on its top/left edge, light on bottom/right, fill inside. */
export function emboss(s: Surface, x: number, y: number, mask: readonly string[], pressed: boolean) {
  const on = (i: number, j: number) => mask[j]?.[i] === '#'
  const [shadow, fill, lit] = pressed
    ? [BTN.pressedEdge, BTN.pressedGlyph, BTN.pressedHi]
    : [BTN.lo2, BTN.glyph, BTN.hi]
  mask.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      if (!on(i, j)) continue
      const c = !on(i - 1, j) || !on(i, j - 1) ? shadow : !on(i + 1, j) || !on(i, j + 1) ? lit : fill
      s.set(x + i, y + j, c)
    }
  })
}

// Gold.
export const GOLD = {
  shadow: 0x34302c,
  deep: 0x45413c,
  brown: 0x685935,
  bronze: 0x6b5d43,
  dull: 0x887749,
  amber: 0x916e4a,
  dim: 0xa3946a,
  pale: 0xbfb97e,
  bright: 0xecce7a,
  aqua: 0xcee1ce,
  ice: 0xbbd6d9,
}

/** Desaturated, dimmer version used for inactive title bars. */
export const dull = (c: Rgb) => mix(scale(c, 0.6), 0x707070, 0.25)

/**
 * Gold title-bar ridge, 7 rows tall: two raised gold lines with a dark crease between them, rounded ends.
 * `active=false` paints the dull brass variant of unfocused windows. `open` leaves the left/right end square so the
 * ridge continues seamlessly into a neighbouring tile.
 */
export function goldRidge(
  s: Surface,
  x: number,
  y: number,
  w: number,
  active: boolean,
  open: { left?: boolean; right?: boolean } = {},
) {
  const rows = active
    ? [0x1e1f25, GOLD.bright, 0xffffff, GOLD.deep, GOLD.dim, GOLD.bright, 0x25262c]
    : [0x1f1f22, 0x86774d, 0x909090, GOLD.shadow, 0x625a45, 0x86774d, 0x222326]
  rows.forEach((c, j) => {
    const edge = j === 0 || j === rows.length - 1
    const l = edge && !open.left ? 1 : 0
    const r = edge && !open.right ? 1 : 0
    s.hline(x + l, y + j, w - l - r, c)
    if (!edge) {
      if (!open.left) s.set(x, y + j, mix(c, s.get(x - 1, y + j), 0.45))
      if (!open.right) s.set(x + w - 1, y + j, mix(c, s.get(x + w, y + j), 0.45))
    }
  })
}

/** Little gold zig-zag "options" mark at the left end of every title bar (7×5). */
export const OPTIONS_MARK = ['##.....', '#.#..##', '#..#.#.', '#...##.', '.....#.']
