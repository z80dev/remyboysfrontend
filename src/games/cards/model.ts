import { mulberry32 } from '../kit/remy'

export const CARD_W = 71
export const CARD_H = 96
export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const
export type Suit = typeof SUITS[number]
export type Card = { id: number; rank: number; suit: Suit; faceUp: boolean }

export function makeDeck(copies = 1): Card[] {
  const cards: Card[] = []
  for (let copy = 0; copy < copies; copy++) {
    for (let rank = 1; rank <= 13; rank++) {
      for (let suit = 0; suit < 4; suit++) cards.push({ id: copy * 52 + (rank - 1) * 4 + suit, rank, suit: SUITS[suit], faceUp: true })
    }
  }
  return cards
}

export function shuffle(cards: readonly Card[], seed: number): Card[] {
  const out = cards.map((card) => ({ ...card }))
  const random = mulberry32(seed)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const card = out[i]
    out[i] = out[j]
    out[j] = card
  }
  return out
}

export const isRed = (card: Pick<Card, 'suit'>): boolean => card.suit === 'hearts' || card.suit === 'diamonds'

const RANK_NAMES = ['', 'Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King']
const COURTS: Record<Suit, readonly string[]> = {
  hearts: ['Rival', 'Nurse', 'Prof. Gwei'],
  diamonds: ['Clerk', 'Curator', 'Maxi'],
  clubs: ['the Remy Boys club', 'the Remy Boys club', 'the Remy Boys club'],
  spades: ['Short and Squeeze', 'the Rug Lord', 'Admin Escrow'],
}

export function cardLabel(card: Card): string {
  if (!card.faceUp) return 'Face-down card'
  const suit = card.suit[0].toUpperCase() + card.suit.slice(1)
  return `${RANK_NAMES[card.rank]} of ${suit}${card.rank >= 11 ? ` (${COURTS[card.suit][card.rank - 11]})` : ''}`
}

export type CardHit = { pile: number; depth: number; x: number; y: number; card?: Card }
export type CardPileLayout = { pile: number; x: number; y: number; cards: readonly Card[]; offset: number | ((card: Card, depth: number) => number) }

export function pileCardPositions(layout: CardPileLayout): CardHit[] {
  let y = layout.y
  return layout.cards.map((card, depth) => {
    const hit = { pile: layout.pile, depth, x: layout.x, y, card }
    y += typeof layout.offset === 'number' ? layout.offset : layout.offset(card, depth)
    return hit
  })
}

export function hitTestPiles(layouts: readonly CardPileLayout[], x: number, y: number): CardHit | null {
  for (let p = layouts.length - 1; p >= 0; p--) {
    const layout = layouts[p]
    const positions = pileCardPositions(layout)
    if (positions.length === 0 && x >= layout.x && x < layout.x + CARD_W && y >= layout.y && y < layout.y + CARD_H) {
      return { pile: layout.pile, depth: -1, x: layout.x, y: layout.y }
    }
    for (let i = positions.length - 1; i >= 0; i--) {
      const hit = positions[i]
      if (x >= hit.x && x < hit.x + CARD_W && y >= hit.y && y < hit.y + CARD_H) return hit
    }
  }
  return null
}

export const easeOut = (t: number): number => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3
export const moveDuration = (distance: number): number => Math.min(220, 120 + Math.max(0, distance) / 5)
export const isDoubleClick = (previous: { time: number; key: string } | null, key: string, time: number): boolean =>
  previous !== null && previous.key === key && time >= previous.time && time - previous.time <= 500
