import { GOLD, OPTIONS_MARK, dark, dull, goldRidge, light, sheen } from './chrome'
import { type Font, LABEL_FONT, TITLE_FONT, drawText, textWidth } from './fonts'
import { type Rgb, Surface, mix } from './surface'

const BAR = sheen(165, 0, 0)

/** Paints the navy bar body (rim, sheen, darker bottom rows) of a 14px title/shade bar at (x,y), bar-local sheen. */
export function barBody(s: Surface, x: number, y: number, w: number) {
  s.fill(x, y, w, 14, (i) => BAR(i - x, 0))
  s.map(x, y, w, 1, dark)
  s.map(x, y + 12, w, 2, dark)
  s.map(x, y + 1, 1, 13, dark)
  s.map(x + 1, y + 1, w - 1, 1, light)
  s.map(x + 1, y + 2, 1, 12, light)
}

/** Gold options zig-zag. */
export function optionsMark(s: Surface, x: number, y: number, ink: Rgb) {
  s.pattern(x, y, OPTIONS_MARK, { '#': ink })
}

/**
 * A full 275px title bar: options mark (main window only), centred bold title flanked by gold ridges between
 * the mark and `ridgeEnd` (bar-local x). Window buttons are painted by the caller.
 */
export function titleBar(
  s: Surface,
  x: number,
  y: number,
  opts: { text: string; active: boolean; mark: boolean; ridgeEnd: number },
) {
  const { text, active, mark, ridgeEnd } = opts
  const ridgeStart = mark ? 20 : 4
  barBody(s, x, y, 275)
  if (mark) optionsMark(s, x + 6, y + 3, active ? GOLD.bright : dull(GOLD.bright))
  const tw = textWidth(TITLE_FONT, text)
  const tx = Math.round((ridgeStart + ridgeEnd - tw) / 2)
  goldRidge(s, x + ridgeStart, y + 4, tx - 4 - ridgeStart, active)
  goldRidge(s, x + tx + tw + 4, y + 4, ridgeEnd - (tx + tw + 4), active)
  drawTitleText(s, TITLE_FONT, text, x + tx, y + 4, active)
}

/** White bold title text (grey on inactive bars), with a soft dark drop shadow. */
export function drawTitleText(s: Surface, font: Font, text: string, x: number, y: number, active: boolean) {
  const ink = active ? 0xffffff : 0x9a9aa6
  const soft = active ? 0xadadb8 : 0x6c6c7a
  drawText(s, font, text, x + 1, y + 1, 0x101018, 0x101018)
  drawText(s, font, text, x, y, ink, soft)
}

/** Round gold dome (minimize / shade). `glint` paints the pale reflection band at the bottom. */
export function goldDome(s: Surface, x: number, y: number, pressed: boolean, active = true) {
  const rows = pressed
    ? [GOLD.shadow, GOLD.deep, GOLD.brown, GOLD.bronze, GOLD.dull, GOLD.dim, GOLD.pale]
    : [GOLD.deep, 0x524a3d, GOLD.bronze, GOLD.dull, GOLD.pale, GOLD.aqua, GOLD.ice]
  rows.forEach((c0, j) => {
    const c = active ? c0 : dull(c0)
    const inset = j === 0 || j === 6 ? 1 : 0
    s.hline(x + 1 + inset, y + 1 + j, 7 - 2 * inset, c)
  })
}

/** Gold close button: bronze tile with a crossed X and a bright centre stud. */
export function goldClose(s: Surface, x: number, y: number, pressed: boolean, active = true) {
  const t = (c: Rgb) => (active ? c : dull(c))
  s.fill(x, y, 9, 9, t(pressed ? GOLD.shadow : GOLD.deep))
  s.frame(x, y, 9, 9, t(pressed ? GOLD.deep : GOLD.bronze))
  for (let i = 1; i < 8; i++) {
    s.set(x + i, y + i, t(pressed ? GOLD.amber : GOLD.dim))
    s.set(x + 8 - i, y + i, t(pressed ? GOLD.amber : GOLD.dim))
  }
  for (const [i, j] of [
    [3, 4],
    [5, 4],
    [4, 3],
    [4, 5],
  ] as const)
    s.set(x + i, y + j, t(GOLD.shadow))
  s.set(x + 4, y + 4, t(pressed ? GOLD.bright : 0xffffff))
}

/** Gold options button: zig-zag mark on navy, inverted (navy mark on gold) while pressed. */
function optionsButton(s: Surface, x: number, y: number, pressed: boolean) {
  s.fill(x, y, 9, 9, pressed ? GOLD.dim : 0x14141f)
  if (pressed) s.frame(x, y, 9, 9, GOLD.dull)
  optionsMark(s, x + 1, y + 2, pressed ? 0x14141f : GOLD.bright)
}

/** The unshade (window-shade active) button: dome with a polished face. */
function unshadeButton(s: Surface, x: number, y: number, pressed: boolean) {
  goldDome(s, x, y, pressed)
  s.fill(x + 2, y + 2, 5, 5, pressed ? GOLD.dim : GOLD.aqua)
  s.hline(x + 3, y + 2, 3, pressed ? GOLD.pale : 0xffffff)
  s.frame(x + 1, y + 1, 7, 7, pressed ? GOLD.shadow : GOLD.bronze)
}

/** Clutter bar column: dark strip with O A I D V; `lit` (0..4) is the highlighted letter, -1 none, -2 disabled. */
function clutterColumn(s: Surface, x: number, y: number, lit: number) {
  s.fill(x, y, 8, 43, (i, j) => ((i - x) % 2 === 1 && (j - y) % 2 === 1 ? 0x202030 : 0x0c0c14))
  s.map(x + 7, y, 1, 43, light)
  const letters = ['O', 'A', 'I', 'D', 'V']
  const ys = [5, 12, 19, 27, 34]
  letters.forEach((ch, k) => {
    const ink = lit === -2 ? 0x30303c : k === lit ? 0xf0f0ff : 0x50506a
    const g = LABEL_FONT.glyphs[ch]
    drawText(s, LABEL_FONT, ch, x + 4 - Math.ceil(g[0].length / 2), y + ys[k], ink)
  })
}

/** TITLEBAR.BMP */
export function paintTitlebar(): Surface {
  const s = new Surface(344, 87)
  s.fill(0, 0, 344, 87, 0x14141f)
  s.fill(0, 0, 27, 43, BAR(20, 0))
  optionsButton(s, 0, 0, false)
  optionsButton(s, 0, 9, true)
  goldDome(s, 9, 0, false)
  goldDome(s, 9, 9, true)
  goldClose(s, 18, 0, false)
  goldClose(s, 18, 9, true)
  goldDome(s, 0, 18, false)
  goldDome(s, 9, 18, true)
  unshadeButton(s, 0, 27, false)
  unshadeButton(s, 9, 27, true)

  // Shade-mode seek slider: groove and three gold thumb variants (left end, middle, right end).
  s.fill(0, 36, 17, 7, 0x2a2a44)
  s.hline(0, 36, 17, 0x08080c)
  s.vline(0, 36, 7, 0x08080c)
  s.hline(1, 42, 16, 0x6c6c7e)
  for (const tx of [17, 20, 23]) {
    s.fill(tx, 36, 3, 7, GOLD.bright)
    s.vline(tx, 36, 7, GOLD.pale)
    s.vline(tx + 2, 36, 7, GOLD.dull)
    s.hline(tx, 42, 3, GOLD.brown)
  }

  for (const active of [true, false]) {
    const y = active ? 0 : 15
    titleBar(s, 27, y, { text: 'WINAMP', active, mark: true, ridgeEnd: 242 })
    windowButtons(s, 27, y, active)

    const ey = active ? 57 : 72
    titleBar(s, 27, ey, { text: "“IT REALLY WHIPS THE LLAMA'S ASS!”", active, mark: true, ridgeEnd: 242 })
    windowButtons(s, 27, ey, active)

    shadeBar(s, 27, active ? 29 : 42, active)
  }

  clutterColumn(s, 304, 0, -1)
  clutterColumn(s, 312, 0, -2)
  for (let k = 0; k < 5; k++) clutterColumn(s, 304 + 8 * k, 44, k)
  return s
}

/** Minimize, shade and close at their places in a 275px bar. */
function windowButtons(s: Surface, x: number, y: number, active: boolean) {
  goldDome(s, x + 244, y + 3, false, active)
  goldDome(s, x + 254, y + 3, false, active)
  goldClose(s, x + 264, y + 3, false, active)
}

/** Main window in shade mode: title, mini visualizer and time wells, mini transport glyphs, mini seek groove. */
function shadeBar(s: Surface, x: number, y: number, active: boolean) {
  barBody(s, x, y, 275)
  const gold = active ? GOLD.bright : dull(GOLD.bright)
  optionsMark(s, x + 6, y + 3, gold)
  drawTitleText(s, TITLE_FONT, 'WINAMP', x + 20, y + 4, active)
  goldRidge(s, x + 64, y + 4, 14, active)
  s.fill(x + 79, y + 4, 40, 7, 0)
  goldRidge(s, x + 120, y + 4, 6, active)
  s.fill(x + 126, y + 4, 33, 7, 0)
  s.set(x + 146, y + 6, 0x00e200)
  s.set(x + 146, y + 8, 0x00e200)
  goldRidge(s, x + 159, y + 4, 6, active)
  // Mini transport: prev, play, pause, stop, next, eject.
  const glyphs = [
    ['#..#', '#.##', '####', '#.##', '#..#'],
    ['#...', '###.', '####', '###.', '#...'],
    ['##.##', '##.##', '##.##', '##.##', '##.##'],
    ['####', '####', '####', '####', '####'],
    ['#..#', '##.#', '####', '##.#', '#..#'],
    ['..#..', '.###.', '#####', '.....', '#####'],
  ]
  let gx = x + 169
  for (const g of glyphs) {
    s.pattern(gx, y + 5, g, { '#': gold })
    s.pattern(
      gx + 1,
      y + 6,
      g.map((r) => r.replace(/#/g, '+')),
      { '+': mix(gold, 0, 0.6) },
    )
    s.pattern(gx, y + 5, g, { '#': gold })
    gx += g[0].length + 4
  }
  s.fill(x + 226, y + 4, 17, 7, 0x1c1c2c)
  s.hline(x + 226, y + 4, 17, 0x08080c)
  s.hline(x + 226, y + 10, 17, 0x6c6c7e)
  windowButtons(s, x, y, active)
  // Shade mode swaps the shade dome for the unshade button.
  unshadeButton(s, x + 254, y + 3, false)
}
