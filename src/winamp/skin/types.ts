import type { Rect, SheetName } from './sprites'

/** One decoded skin bitmap. `canvas` is for pixel reads/canvas blits, `url` for CSS `background-image`. */
export type Sheet = { canvas: HTMLCanvasElement; url: string; width: number; height: number }

/** PLEDIT.TXT colours (CSS colours) and font family. */
export type PlaylistStyle = { normal: string; current: string; normalBg: string; selectedBg: string; font: string }

export interface Skin {
  name: string
  /** Every sheet is present: a .wsz missing one falls back to the default skin's (as Winamp does). NUMS_EX is optional. */
  sheets: Record<Exclude<SheetName, 'NUMS_EX'>, Sheet> & { NUMS_EX?: Sheet }
  /** VISCOLOR.TXT: 24 CSS colours (0 bg, 1 dots, 2–17 spectrum top→bottom, 18–22 oscilloscope, 23 peak dots). */
  viscolor: string[]
  pledit: PlaylistStyle
}

/** Wraps a painted/decoded canvas as a sheet (data URL, so CSS can use it synchronously). */
export function toSheet(canvas: HTMLCanvasElement): Sheet {
  return { canvas, url: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height }
}

export type SpriteCss = { backgroundImage: string; backgroundPosition: string; width: number; height: number }

/** CSS for one sprite: `background` from its sheet, sized to the rect. */
export function spriteStyle(sheet: Sheet, [x, y, w, h]: Rect): SpriteCss {
  return { backgroundImage: `url(${sheet.url})`, backgroundPosition: `-${x}px -${y}px`, width: w, height: h }
}
