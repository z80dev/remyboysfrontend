import { CARD_H, CARD_W, type Card } from '../cards/model'

export type Point = { x: number; y: number }
export type Rect = Point & { width: number; height: number }
export type HeartsLayout = {
  pocket: boolean
  compactTrick: boolean
  wideShort: boolean
  width: number
  height: number
  scale: number
  ox: number
  oy: number
  seats: Point[]
  centers: Point[]
  plates: Rect[]
  pass: Rect
  score: Rect
  hand: { viewport: Rect; start: number; step: number; y: number; contentWidth: number; scroll: number }
}

/** One geometry for the felt, DOM overlays, hit regions and animation endpoints. Pocket coordinates are CSS pixels. */
export function heartsLayout(surfaceWidth: number, surfaceHeight: number, pocket: boolean, count: number, scroll = 0): HeartsLayout {
  const width = pocket ? surfaceWidth : 640
  const height = pocket ? surfaceHeight : 432
  const scale = pocket ? 1 : Math.min(surfaceWidth / width, surfaceHeight / height)
  const wideShort = pocket && width >= 720 && height < 430
  const step = pocket ? Math.floor(Math.max(32, Math.min(42, (width - 16 - CARD_W) / Math.max(1, count - 1)))) : 14
  const fanWidth = count ? CARD_W + step * (count - 1) : 0
  const viewport = pocket ? { x: 8, y: height - 119, width: width - 16, height: 111 } : { x: 0, y: 313, width, height: 111 }
  const contentWidth = Math.max(viewport.width, fanWidth)
  const hand = { viewport, start: Math.round(pocket ? Math.max(0, (viewport.width - fanWidth) / 2) : (width - fanWidth) / 2),
    step, y: pocket ? height - 104 : 328, contentWidth, scroll: Math.max(0, Math.min(scroll, contentWidth - viewport.width)) }
  const pass = pocket ? { x: wideShort ? width - 128 : Math.round((width - 120) / 2), y: wideShort ? viewport.y - 44 : height - 215, width: 120, height: 44 } :
    { x: 260, y: 277, width: 120, height: 32 }
  const score = pocket ? { x: 8, y: wideShort ? viewport.y - 44 : height - 169, width: wideShort ? 180 : width - 16, height: 44 } :
    { x: 12, y: 405, width: 180, height: 20 }
  const plateWidth = (width - 32) / 3
  const plates = pocket ? [
    { x: 0, y: 0, width: 0, height: 0 },
    { x: 8, y: 8, width: plateWidth, height: wideShort ? 48 : 100 },
    { x: 16 + plateWidth, y: 8, width: plateWidth, height: wideShort ? 48 : 100 },
    { x: 24 + plateWidth * 2, y: 8, width: plateWidth, height: wideShort ? 48 : 100 }
  ] : [
    { x: 0, y: 0, width: 0, height: 0 },
    { x: 8, y: 40, width: 160, height: 48 },
    { x: 230, y: 8, width: 180, height: 48 },
    { x: 472, y: 40, width: 160, height: 48 }
  ]
  const compactTrick = pocket && (wideShort || pass.y - 12 - 116 < CARD_H * 2 + 6)
  const trickTop = wideShort ? Math.max(56, Math.min(64, viewport.y - CARD_H - 15)) : pocket ?
    Math.max(108, Math.min(116 + Math.max(0, (pass.y - 12 - 116 - CARD_H * 2 - 6) / 2), pass.y - (compactTrick ? 109 : 108))) : 120
  const trickGap = pocket ? Math.max(51, Math.min(60, (pass.y - 12 - trickTop - CARD_H) / 2)) : 48
  const centers = pocket ? compactTrick ?
    [3, 0, 1, 2].map(column => ({ x: (width - CARD_W * 4) / 2 + column * CARD_W, y: trickTop })) : [
    { x: width / 2 - 35, y: trickTop + trickGap * 2 },
    { x: width / 2 - 111, y: trickTop + trickGap },
    { x: width / 2 - 35, y: trickTop },
    { x: width / 2 + 41, y: trickTop + trickGap }
  ] : [{ x: 285, y: 216 }, { x: 207, y: 168 }, { x: 285, y: 120 }, { x: 363, y: 168 }]
  const seats = pocket ? [
    { x: width / 2, y: hand.y + CARD_H / 2 },
    ...plates.slice(1).map(plate => ({ x: plate.x + plate.width / 2, y: plate.y + 24 }))
  ] : [{ x: 320, y: 376 }, { x: 70, y: 220 }, { x: 320, y: 112 }, { x: 570, y: 220 }]
  return { pocket, compactTrick, wideShort, width, height, scale, ox: (surfaceWidth - width * scale) / 2, oy: (surfaceHeight - height * scale) / 2,
    seats, centers, plates, pass, score, hand }
}

export function handCardPosition(layout: HeartsLayout, depth: number, raised = false): Point {
  const { hand } = layout
  return { x: (layout.pocket ? hand.viewport.x - hand.scroll : 0) + hand.start + depth * hand.step, y: hand.y - (raised ? 15 : 0) }
}

/** Exposed, selectable regions, not the covered 71px card bounds. The last card retains its entire width. */
export function handCardTarget(layout: HeartsLayout, depth: number, count: number, raised = false): Rect {
  return { ...handCardPosition(layout, depth, raised), width: depth === count - 1 ? CARD_W : layout.hand.step, height: CARD_H }
}

export function hitHand(layout: HeartsLayout, cards: readonly Card[], raised: readonly number[], x: number, y: number): number {
  x = (x - layout.ox) / layout.scale
  y = (y - layout.oy) / layout.scale
  if (layout.pocket && (x < layout.hand.viewport.x || x >= layout.hand.viewport.x + layout.hand.viewport.width ||
    y < layout.hand.viewport.y || y >= layout.hand.viewport.y + layout.hand.viewport.height)) return -1
  for (let depth = cards.length - 1; depth >= 0; depth--) {
    const target = handCardTarget(layout, depth, cards.length, raised.includes(cards[depth].id))
    if (x >= target.x && x < target.x + (layout.pocket ? target.width : CARD_W) && y >= target.y && y < target.y + CARD_H) return depth
  }
  return -1
}

/** Keep the whole exposed strip visible (the last card needs its whole width), without scrolling the page. */
export function handScrollForCard(layout: HeartsLayout, depth: number, count: number): number {
  const left = layout.hand.start + depth * layout.hand.step
  const right = left + (depth === count - 1 ? CARD_W : layout.hand.step)
  const scroll = left < layout.hand.scroll ? left : right > layout.hand.scroll + layout.hand.viewport.width ? right - layout.hand.viewport.width : layout.hand.scroll
  return Math.max(0, Math.min(scroll, layout.hand.contentWidth - layout.hand.viewport.width))
}

export function moonPath(layout: HeartsLayout, seat: number): string {
  const origin = layout.seats[seat]
  const end = { x: layout.width - 36, y: layout.pocket ? 84 : 112 }
  return `path('M ${origin.x} ${origin.y} Q ${layout.width / 2} ${Math.min(origin.y, 100)} ${end.x} ${end.y}')`
}

/** Local X in the rotated opponent fan; shared by static painting and play origins. */
export function opponentFanOffset(depth: number, count: number, peek: boolean): number {
  const step = peek ? 14 : 5
  return -(CARD_W + step * (count - 1)) / 2 + depth * step
}

export function opponentCardOrigin(layout: HeartsLayout, seat: number, depth: number, count: number, peek: boolean): Point {
  const origin = layout.seats[seat]
  if (layout.pocket) return { x: origin.x - CARD_W / 2, y: origin.y - CARD_H / 2 }
  const offset = opponentFanOffset(depth, count, peek) + CARD_W / 2
  return { x: origin.x - CARD_W / 2 + (seat === 2 ? offset : 0),
    y: origin.y - CARD_H / 2 + (seat === 1 ? offset : seat === 3 ? -offset : 0) }
}
