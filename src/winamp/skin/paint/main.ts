import { VIS_DOT, dark, lcdGrid, light, well, windowBody } from './chrome'
import { SMALL_FONT, drawText } from './fonts'
import { type Rgb, Surface, scale } from './surface'

const LCD_GREEN = 0x00e200

/** MAIN.BMP: the 275×116 main window body. */
export function paintMain(): Surface {
  const s = new Surface(275, 116)
  windowBody(s)

  // Visualizer / time LCD with its dotted grid, the analyzer axes and the time colon.
  well(s, 11, 22, 93, 43, lcdGrid(VIS_DOT))
  for (let y = 42; y <= 60; y += 2) s.set(22, y, y % 4 === 2 ? 0x5e95ea : 0x005284)
  for (let x = 22; x <= 100; x += 2) s.set(x, 60, x % 4 === 2 ? 0x5e95ea : 0x005284)
  s.hline(72, 30, 3, LCD_GREEN)
  s.hline(72, 34, 3, LCD_GREEN)

  // Song title, bitrate and sample-rate wells.
  well(s, 108, 23, 159, 14)
  well(s, 108, 40, 20, 12)
  well(s, 153, 40, 15, 12)
  drawText(s, SMALL_FONT, 'kbps', 131, 43, 0xffffff)
  drawText(s, SMALL_FONT, 'kHz', 171, 43, 0xffffff)

  // Seek bar channel.
  s.map(18, 74, 246, 7, (c) => scale(c, 0.82))
  s.map(16, 72, 248, 2, dark)
  s.map(16, 74, 2, 7, dark)
  s.map(18, 81, 247, 1, light)
  s.map(264, 72, 1, 9, light)

  paintBolt(s, 249, 89)
  return s
}

/** Our gold lightning-bolt badge: a silver diamond frame with a gold disc and a bolt cutting across it (17×17). */
function paintBolt(s: Surface, x0: number, y0: number) {
  const outline: Rgb = 0x101018
  for (let j = 0; j < 17; j++) {
    for (let i = 0; i < 17; i++) {
      const dx = i - 8
      const dy = j - 8
      const r = Math.abs(dx) + Math.abs(dy)
      let c: Rgb | undefined
      if (r === 7) c = outline
      else if (r === 6 || r === 5) c = dx + dy < 0 ? 0xd8d8e0 : dx - dy > 0 ? 0xa8a8b4 : 0xc4c4cc
      else if (r === 4) c = 0x5a4420
      else if (r < 4) c = dx + dy < -1 ? 0xf0c068 : dx + dy > 1 ? 0xb87828 : 0xe0a040
      if (c !== undefined) s.set(x0 + i, y0 + j, c)
    }
  }
  // The bolt: a two-pixel zig-zag along the anti-diagonal, overshooting the frame at both ends.
  const bolt: [number, number][] = [
    [15, 0],
    [14, 1],
    [13, 2],
    [12, 3],
    [11, 4],
    [10, 5],
    [9, 6],
    [10, 7],
    [9, 8],
    [8, 9],
    [7, 8],
    [6, 9],
    [5, 10],
    [4, 11],
    [3, 12],
    [2, 13],
    [1, 14],
    [0, 15],
  ]
  for (const [i, j] of bolt) {
    s.set(x0 + i + 1, y0 + j + 1, 0x3a2808)
    s.set(x0 + i - 1, y0 + j - 1, 0x3a2808)
  }
  for (const [i, j] of bolt) {
    s.set(x0 + i - 1, y0 + j, 0xfce49a)
    s.set(x0 + i, y0 + j, 0xf0b850)
    s.set(x0 + i + 1, y0 + j, 0xb87828)
  }
}
