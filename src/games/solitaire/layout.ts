import { pileCardPositions, type CardHit, type CardPileLayout } from '../cards/model'
import { pile, type State } from './engine'

/** Pocket width follows the seven-column rule; short screens also fit the longest run. */
export function boardScale(state: State, width: number, height: number, pocket: boolean): number {
  if (!pocket) return 1
  const longest = state.tableau.reduce((bottom, cards) => {
    const down = cards.filter(card => !card.faceUp).length
    return Math.max(bottom, 129 + down * 3 + Math.max(0, cards.length - down - 1) * 6 + 96)
  }, 315)
  return Math.max(.1, Math.min(1, (width - 8 * 11) / (7 * 71), height / longest))
}

export function layouts(state: State, width: number, height: number, pocket: boolean): CardPileLayout[] {
  const left = Math.max(11, (width - 563) / 2)
  const result: CardPileLayout[] = [
    { pile: 0, x: left, y: 11, cards: state.stock.length ? [state.stock[state.stock.length - 1]] : [], offset: 0 },
    { pile: 1, x: left + 82, y: 11, cards: state.waste.slice(-(state.options.draw === 3 ? 3 : 1)), offset: 0 }
  ]
  for (let i = 0; i < 4; i++) result.push({ pile: i + 2, x: left + (i + 3) * 82, y: 11, cards: state.homes[i].slice(-1), offset: 0 })
  for (let i = 0; i < 7; i++) {
    const cards = state.tableau[i]
    const down = cards.filter(card => !card.faceUp).length
    const up = cards.length - down
    const offset = Math.max(pocket ? 0 : 6, Math.min(pocket ? 36 : 15, (height - 129 - 96 - down * 3) / Math.max(1, up - 1)))
    result.push({ pile: i + 6, x: left + i * 82, y: 129, cards, offset: card => card.faceUp ? offset : 3 })
  }
  return result
}

export function positions(state: State, width: number, height: number, pocket: boolean): CardHit[] {
  return layouts(state, width, height, pocket).flatMap(layout => {
    const hits = pileCardPositions(layout)
    return hits.map((hit, i) => ({ ...hit, depth: layout.pile === 1 ? state.waste.length - hits.length + i : layout.pile < 6 ? pile(state, layout.pile).length - 1 : hit.depth,
      x: layout.pile === 1 ? hit.x + i * 12 : hit.x }))
  })
}

/** The original deal visits each row left to right, omitting columns already complete. */
export function dealOrder(hits: readonly CardHit[]): CardHit[] {
  return hits.filter(hit => hit.pile >= 6 && hit.card).sort((a, b) => a.depth - b.depth || a.pile - b.pile)
}
