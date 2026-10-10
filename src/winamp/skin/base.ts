import {
  paintCbuttons,
  paintLevels,
  paintMonoster,
  paintNumbers,
  paintPlaypaus,
  paintPosbar,
  paintShufrep,
  paintText,
} from './paint/controls'
import { paintEqEx, paintEqmain } from './paint/eq'
import { paintMain } from './paint/main'
import { paintPledit } from './paint/pledit'
import { paintTitlebar } from './paint/titlebar'
import { type Skin, toSheet } from './types'

/** VISCOLOR.TXT of the base skin: background, grid dots, 16 analyzer bands (top→bottom), 5 scope shades, peaks. */
const VISCOLOR = [
  [0, 0, 0],
  [24, 33, 41],
  [239, 49, 16],
  [206, 41, 16],
  [214, 90, 0],
  [214, 102, 0],
  [214, 115, 0],
  [198, 123, 8],
  [222, 165, 24],
  [214, 181, 33],
  [189, 222, 41],
  [148, 222, 33],
  [41, 206, 16],
  [50, 190, 16],
  [57, 181, 16],
  [49, 156, 8],
  [41, 148, 0],
  [24, 132, 8],
  [255, 255, 255],
  [214, 214, 222],
  [181, 189, 189],
  [160, 170, 175],
  [148, 156, 165],
  [150, 150, 150],
].map(([r, g, b]) => `rgb(${r},${g},${b})`)

let cached: Skin | null = null

/** The built-in Winamp 2.x look, painted procedurally into canvases in .wsz sheet layout (memoized). */
export function baseSkin(): Skin {
  if (cached) return cached
  const sheet = (paint: () => { toCanvas(): HTMLCanvasElement }) => toSheet(paint().toCanvas())
  cached = {
    name: 'Base Skin',
    sheets: {
      MAIN: sheet(paintMain),
      TITLEBAR: sheet(paintTitlebar),
      CBUTTONS: sheet(paintCbuttons),
      NUMBERS: sheet(paintNumbers),
      TEXT: sheet(paintText),
      VOLUME: sheet(() => paintLevels(false)),
      BALANCE: sheet(() => paintLevels(true)),
      POSBAR: sheet(paintPosbar),
      PLAYPAUS: sheet(paintPlaypaus),
      MONOSTER: sheet(paintMonoster),
      SHUFREP: sheet(paintShufrep),
      EQMAIN: sheet(paintEqmain),
      EQ_EX: sheet(paintEqEx),
      PLEDIT: sheet(paintPledit),
    },
    viscolor: VISCOLOR,
    pledit: { normal: '#00FF00', current: '#FFFFFF', normalBg: '#000000', selectedBg: '#0000C6', font: 'Arial' },
  }
  return cached
}
