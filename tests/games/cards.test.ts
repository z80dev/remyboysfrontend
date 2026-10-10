import { describe, expect, test } from 'bun:test'
import { CARD_H, CARD_W, cardLabel, easeOut, hitTestPiles, isDoubleClick, isRed, makeDeck, moveDuration, pileCardPositions, shuffle } from '../../src/games/cards/model'

describe('Cards.dll model', () => {
  test('native geometry and rank-major C D H S deck order', () => {
    expect([CARD_W, CARD_H]).toEqual([71, 96])
    const deck = makeDeck(2)
    expect(deck).toHaveLength(104)
    expect(new Set(deck.map((card) => card.id)).size).toBe(104)
    expect(deck.slice(0, 4).map((card) => [card.rank, card.suit])).toEqual([[1, 'clubs'], [1, 'diamonds'], [1, 'hearts'], [1, 'spades']])
    expect(deck[51]).toMatchObject({ rank: 13, suit: 'spades' })
  })
  test('shuffle is deterministic, complete and does not mutate input cards', () => {
    const deck = makeDeck()
    const first = shuffle(deck, 617)
    expect(first).toEqual(shuffle(deck, 617))
    expect(first).not.toEqual(shuffle(deck, 1))
    expect(first.map((card) => card.id).sort((a, b) => a - b)).toEqual(deck.map((card) => card.id))
    first[0].faceUp = false
    expect(deck.every((card) => card.faceUp)).toBe(true)
  })
  test('court labels identify the Cabald and hidden cards do not leak their identity', () => {
    expect(cardLabel({ id: 47, rank: 12, suit: 'spades', faceUp: true })).toBe('Queen of Spades (the Rug Lord)')
    expect(cardLabel({ id: 47, rank: 12, suit: 'spades', faceUp: false })).toBe('Face-down card')
    expect(isRed({ suit: 'diamonds' })).toBe(true)
    expect(isRed({ suit: 'clubs' })).toBe(false)
  })
  test('stack hit-testing selects the exposed card in reverse paint order', () => {
    const cards = makeDeck().slice(0, 3)
    const layout = { pile: 2, x: 11, y: 111, cards, offset: 15 }
    expect(pileCardPositions(layout).map((hit) => hit.y)).toEqual([111, 126, 141])
    expect(hitTestPiles([layout], 20, 119)?.depth).toBe(0)
    expect(hitTestPiles([layout], 20, 130)?.depth).toBe(1)
    expect(hitTestPiles([layout], 20, 160)?.depth).toBe(2)
    expect(hitTestPiles([layout], 82, 160)).toBeNull()
    expect(hitTestPiles([{ ...layout, cards: [] }], 20, 160)?.depth).toBe(-1)
    expect(hitTestPiles([layout, { ...layout, pile: 3 }], 20, 160)?.pile).toBe(3)
  })
  test('mixed face-down offsets follow the card being covered', () => {
    const cards = makeDeck().slice(0, 3)
    cards[0].faceUp = false
    const positions = pileCardPositions({ pile: 1, x: 0, y: 0, cards, offset: (card) => card.faceUp ? 15 : 3 })
    expect(positions.map((hit) => hit.y)).toEqual([0, 3, 18])
  })
  test('Windows double-click boundary and distance tweens', () => {
    expect(isDoubleClick({ time: 100, key: 'a' }, 'a', 600)).toBe(true)
    expect(isDoubleClick({ time: 100, key: 'a' }, 'a', 601)).toBe(false)
    expect(isDoubleClick({ time: 100, key: 'a' }, 'b', 200)).toBe(false)
    expect(isDoubleClick(null, 'a', 200)).toBe(false)
    expect(isDoubleClick({ time: 100, key: 'a' }, 'a', 99)).toBe(false)
    expect(moveDuration(0)).toBe(120)
    expect(moveDuration(10000)).toBe(220)
    expect(easeOut(0)).toBe(0)
    expect(easeOut(1)).toBe(1)
    expect(easeOut(0.5)).toBeGreaterThan(0.5)
  })
})
