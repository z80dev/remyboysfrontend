import { CARD_W, CARD_H, pileCardPositions, type CardHit, type CardPileLayout } from '../cards/model'
import type { SpiderState } from './engine'

export type SpiderLayout = {
  scale: number
  cardW: number
  cardH: number
  bottom: number
  top: number
  viewBottom: number
  pageStep: number
  maxScroll: number[]
  scroll: number[]
  layouts: CardPileLayout[]
  stockX: number
}

/** Ten width-fit columns. Each overflowing column pages independently, never shrinking readable strips. */
export function spiderLayout(state: SpiderState, width: number, height: number, pocket = false, pages: readonly number[] = []): SpiderLayout {
  const margin = width <= 350 ? 0 : 10
  const widthFit = (width - margin * 2 - 9 * (width <= 350 ? 0 : 3)) / (10 * CARD_W)
  const heightFit = pocket && width > height ? (height - 122) / (CARD_H * 2) : 1
  const scale = Math.min(1, widthFit, heightFit)
  const cardW = CARD_W * scale
  const cardH = pocket && width <= height ? 80 : CARD_H * scale
  const bottom = height - cardH - 14
  const paging = pocket || state.piles.some(cards => cards.slice(0, -1).reduce((n, c) => n + (c.faceUp ? 12 : 4), 0) * scale + cardH > bottom - 20)
  const top = paging ? 54 : 10
  const viewBottom = bottom - (paging ? 54 : 10)
  const viewport = Math.max(cardH, viewBottom - top)
  const pageStep = Math.max(32, viewport - cardH)
  const maxScroll: number[] = []
  const scroll: number[] = []
  const layouts: CardPileLayout[] = state.piles.map((cards, pile) => {
    const natural = cards.slice(0, -1).reduce((n, c) => n + (c.faceUp ? (pocket ? 32 / scale : 18) : 4), 0)
    const faceDown = cards.slice(0, -1).filter(c => !c.faceUp).length * 4
    const faceUp = cards.slice(0, -1).filter(c => c.faceUp).length
    const step = pocket ? 32 / scale : Math.max(12, Math.min(18, (viewport / scale - cardH / scale - faceDown) / Math.max(1, faceUp)))
    const total = pocket ? natural : faceDown + faceUp * step
    maxScroll[pile] = Math.max(0, total * scale + cardH - viewport)
    scroll[pile] = Math.min(maxScroll[pile], Math.max(0, pages[pile] ?? maxScroll[pile]))
    return { pile, cards, x: Math.floor((margin + pile * (width - margin * 2 - cardW) / 9) / scale), y: (top - scroll[pile]) / scale,
      cardHeight: cardH / scale, offset: c => c.faceUp ? step : 4 }
  })
  return { scale, cardW, cardH, bottom, top, viewBottom: top + viewport, pageStep, maxScroll, scroll, layouts,
    stockX: width - cardW - 14 - Math.max(0, state.stock.length / 10 - 1) * 5 }
}

export function spiderHitTest(layout: SpiderLayout, x: number, y: number): CardHit | null {
  if (y < layout.top || y >= layout.viewBottom) return null
  const nx = x / layout.scale
  const ny = y / layout.scale
  // Nearest column owns the gap; ties belong to the lower-numbered pile.
  let column = 0
  let distance = Infinity
  for (let p = 0; p < layout.layouts.length; p++) {
    const d = Math.abs(nx - layout.layouts[p].x - CARD_W / 2)
    if (d < distance) { column = p; distance = d }
  }
  const pile = layout.layouts[column]
  const positions = pileCardPositions(pile)
  for (let i = positions.length - 1; i >= 0; i--) {
    const hit = positions[i]
    if (ny >= hit.y && ny < hit.y + layout.cardH / layout.scale) return hit
  }
  return positions.length ? null : { pile: column, depth: -1, x: pile.x, y: pile.y }
}
