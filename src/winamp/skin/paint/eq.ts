import { BTN, GOLD, dark, goldRidge, greyButton, light, windowBody } from './chrome'
import { LEVEL_RAMP, drawLabel, levelShade, toggleButton } from './controls'
import { LABEL_FONT, SMALL_FONT, drawText, textWidth } from './fonts'
import { Surface, mix, ramp, scale } from './surface'
import { barBody, goldClose, goldDome, titleBar } from './titlebar'

const LABEL_WHITE = 0xe8e8f0
const DB_YELLOW = 0xd4a80c

/** One EQ slider frame (14×63): a vertical level bar in a recessed channel. */
function eqSliderFrame(s: Surface, x: number, y: number, t: number) {
  const mid = ramp(LEVEL_RAMP, t)
  s.fill(x, y, 15, 63, 0x383758)
  s.vline(x + 3, y + 1, 61, 0x13131e)
  for (let c = 0; c < 4; c++) s.vline(x + 4 + c, y + 1, 61, levelShade(mid, c))
  s.vline(x + 8, y + 1, 61, 0x9393a5)
  s.hline(x + 4, y, 4, 0x13131e)
  s.hline(x + 4, y + 62, 4, 0x9393a5)
  s.vline(x + 14, y, 63, 0xcec6d6)
}

/** Grey square EQ knob (11×11). */
function eqThumb(s: Surface, x: number, y: number, pressed: boolean) {
  s.fill(x, y, 11, 11, pressed ? BTN.pressedFace : BTN.face)
  s.bevel(x, y, 11, 11, pressed ? BTN.pressedHi : BTN.hi, BTN.lo2)
  s.hline(x + 1, y + 9, 9, BTN.lo1)
  s.vline(x + 9, y + 1, 9, BTN.lo1)
  s.hline(x + 3, y + 4, 5, pressed ? BTN.pressedEdge : BTN.lo2)
  s.hline(x + 3, y + 6, 5, pressed ? BTN.pressedEdge : BTN.lo2)
}

/** EQMAIN.BMP */
export function paintEqmain(): Surface {
  const s = new Surface(275, 315)
  windowBody(s)
  // Response graph comb.
  for (let k = 0; k < 10; k++) s.map(88 + 12 * k, 17, 1, 19, (c) => mix(c, 0x9a9aae, 0.55))
  s.map(86, 26, 113, 1, (c) => mix(c, 0x9a9aae, 0.55))
  // Shadowed column behind the preamp slider.
  s.map(19, 36, 18, 68, (c, x) => scale(c, 0.85 + (0.1 * Math.abs(x - 28)) / 9))
  // dB scale.
  for (const y of [39, 68, 98]) {
    for (const x of [16, 36]) s.hline(x, y, 4, LABEL_WHITE)
    for (let k = 0; k <= 10; k++) s.hline(73 + 18 * k, y, 4, LABEL_WHITE)
  }
  const db = (sign: string, y: number) => {
    const x = 45 + drawText(s, LABEL_FONT, sign, 45, y, DB_YELLOW) + 2
    drawText(s, SMALL_FONT, 'db', x, y - 1, DB_YELLOW)
  }
  db('+12', 37)
  db('+0', 66)
  db('-12', 96)
  drawText(s, LABEL_FONT, 'PREAMP', 17, 103, LABEL_WHITE)
  ;['60', '170', '310', '600', '1K', '3K', '6K', '12K', '14K', '16K'].forEach((f, k) => {
    drawText(s, LABEL_FONT, f, 85 + 18 * k - Math.floor(textWidth(LABEL_FONT, f) / 2), 103, LABEL_WHITE)
  })

  // Close button and the ON/AUTO toggles in their four states.
  goldClose(s, 0, 116, false)
  goldClose(s, 0, 125, true)
  const toggles = [
    [10, false, false],
    [69, false, true],
    [128, true, false],
    [187, true, true],
  ] as const
  for (const [x, pressed, on] of toggles) {
    toggleButton(s, x, 119, 26, 13, pressed, on, 'ON')
    toggleButton(s, x + 26, 119, 33, 13, pressed, on, 'AUTO')
  }

  // Title bars.
  for (const [y, active] of [
    [134, true],
    [149, false],
  ] as const) {
    titleBar(s, 0, y, { text: 'WINAMP EQUALIZER', active, mark: false, ridgeEnd: 251 })
    goldDome(s, 254, y + 3, false, active)
    goldClose(s, 264, y + 3, false, active)
  }
  goldDome(s, 254, 152, true)

  // Slider frames, knobs, presets button.
  for (let k = 0; k < 28; k++) eqSliderFrame(s, 13 + 15 * (k % 14), 164 + 65 * Math.floor(k / 14), k / 27)
  eqThumb(s, 0, 164, false)
  eqThumb(s, 0, 176, true)
  for (const [y, pressed] of [
    [164, false],
    [176, true],
  ] as const) {
    greyButton(s, 224, y, 45, 13, pressed)
    drawLabel(s, 'PRESETS', 230 + (pressed ? 1 : 0), y + 3 + (pressed ? 1 : 0), pressed ? 0x0a0a12 : 0x1c2838, pressed)
  }

  // Graph background, line colours, preamp line.
  s.fill(0, 294, 113, 19, 0x2c2b43)
  for (let k = 0; k < 10; k++) s.vline(2 + 12 * k, 294, 19, 0x6c6c7e)
  for (let j = 0; j < 19; j++) s.set(115, 294 + j, ramp(LEVEL_RAMP, 1 - j / 18))
  s.hline(0, 314, 113, 0xbacbdd)
  return s
}

/** EQ_EX.BMP: equalizer shade bars, tiny volume/balance knobs and the shade-mode buttons. */
export function paintEqEx(): Surface {
  const s = new Surface(275, 82)
  for (const [y, active] of [
    [0, true],
    [15, false],
  ] as const) {
    barBody(s, 0, y, 275)
    goldRidge(s, 6, y + 4, 52, active)
    for (const [x, w] of [
      [61, 96],
      [163, 44],
    ] as const) {
      s.map(x, y + 4, w, 7, (c) => scale(c, 0.75))
      s.map(x, y + 4, w, 1, dark)
      s.map(x, y + 4, 1, 7, dark)
      s.map(x, y + 10, w, 1, light)
      s.map(x + w - 1, y + 4, 1, 7, light)
    }
    goldRidge(s, 209, y + 4, 42, active)
    goldDome(s, 254, y + 3, false, active)
    goldClose(s, 264, y + 3, false, active)
  }
  // Tiny knobs: left end, centre, right end shapes for volume (x 1..9) and balance (x 11..19).
  for (const base of [1, 11]) {
    for (let k = 0; k < 3; k++) {
      const x = base + 3 * k
      s.fill(x, 30, 3, 7, GOLD.bright)
      s.vline(x, 30, 7, k === 0 ? GOLD.dull : GOLD.pale)
      s.vline(x + 2, 30, 7, k === 2 ? GOLD.dull : GOLD.dim)
      s.hline(x, 36, 3, GOLD.brown)
    }
  }
  goldDome(s, 1, 38, true)
  goldDome(s, 1, 47, true)
  goldClose(s, 11, 38, false)
  goldClose(s, 11, 47, true)
  return s
}
