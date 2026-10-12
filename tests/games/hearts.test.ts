import { describe, expect, test } from 'bun:test'
import { makeDeck, type Card } from '../../src/games/cards/model'
import { acknowledge, aiPass, aiPlay, deal, legalCards, nextHand, passCards, passDirection, passTarget, playCard,
  scoreHand, trickWinner, visibleMoonThreat, winners, type HeartsState, type Play } from '../../src/games/hearts/engine'
import { handCardPosition, handCardTarget, handScrollForCard, heartsLayout, hitHand, moonPath, opponentCardOrigin,
  opponentFanOffset, type Rect } from '../../src/games/hearts/layout'
import { rankingMessage, trickMessage, trickSeatLabel } from '../../src/games/hearts/strings'

const deck = makeDeck()
function card(suit: Card['suit'], rank: number): Card {
  return deck.find(c => c.suit === suit && c.rank === rank)!
}
function position(cards: Card[], overrides: Partial<HeartsState> = {}): HeartsState {
  return { ...deal(7), phase: 'play', hands: [cards, [], [], []], turn: 0, leader: 0, tricks: 1, ...overrides }
}

function moonHistory(heartCount: number, queen = false): Play[] {
  const penalties = [...deck.filter(c => c.suit === 'hearts').slice(0, heartCount), ...(queen ? [card('spades', 12)] : [])]
  const fillers = deck.filter(c => c.suit === 'spades' && c.rank !== 12 || c.suit === 'clubs')
  const history: Play[] = []
  for (let i = 0; i < 6; i++) {
    history.push({ seat: 1, card: card('diamonds', i + 9 > 13 ? 1 : i + 9) })
    for (const seat of [2, 3, 0] as const) history.push({ seat, card: penalties.shift() ?? fillers.shift()! })
  }
  return history
}

describe('Windows Hearts rules', () => {
  test('seeded deal gives four sorted thirteen-card hands, complete unique deck', () => {
    const state = deal(17)
    expect(state).toEqual(deal(17))
    expect(state.hands.map(h => h.length)).toEqual([13, 13, 13, 13])
    expect(new Set(state.hands.flat().map(c => c.id)).size).toBe(52)
    for (const hand of state.hands) {
      const suits = hand.map(c => ['clubs', 'diamonds', 'spades', 'hearts'].indexOf(c.suit))
      expect(suits).toEqual([...suits].sort((a, b) => a - b))
    }
  })
  test('pass rotation, exact three, received cards stay identified until acknowledgement', () => {
    expect([0, 1, 2, 3, 4].map(passDirection)).toEqual(['left', 'right', 'across', 'hold', 'left'])
    for (let hand = 0; hand < 3; hand++) {
      const state = deal(10, hand)
      const picks = state.hands.map(cards => cards.slice(0, 3).map(c => c.id))
      expect(passCards(state, [[], ...picks.slice(1)])).toBe(state)
      expect(passCards(state, [[picks[0][0], picks[0][0], picks[0][1]], ...picks.slice(1)])).toBe(state)
      const passed = passCards(state, picks)
      for (let seat = 0; seat < 4; seat++) expect(picks[seat].every(id => passed.hands[passTarget(seat, hand)].some(c => c.id === id))).toBe(true)
      expect(passed.received).toHaveLength(3)
      expect(passed.phase).toBe('received')
      expect(acknowledge(passed).received).toEqual([])
      expect(acknowledge(passed).phase).toBe('play')
    }
    expect(deal(10, 3).phase).toBe('play')
  })
  test('two of clubs must lead, then follow suit', () => {
    const state = deal(22, 3)
    expect(legalCards(state)).toEqual([card('clubs', 2)])
    const next = playCard(state, legalCards(state)[0].id)
    const hand = next.hands[next.turn]
    if (hand.some(c => c.suit === 'clubs')) expect(legalCards(next).every(c => c.suit === 'clubs')).toBe(true)
    const follow = position([card('clubs', 7), card('hearts', 1)], { trick: [{ seat: 3, card: card('clubs', 3) }] })
    expect(legalCards(follow)).toEqual([card('clubs', 7)])
    expect(playCard(follow, card('hearts', 1).id)).toBe(follow)
  })
  test('first trick forbids points unless no alternative exists', () => {
    const trick = [{ seat: 3 as const, card: card('clubs', 2) }]
    expect(legalCards(position([card('diamonds', 3), card('hearts', 5), card('spades', 12)], { tricks: 0, trick }))).toEqual([card('diamonds', 3)])
    expect(legalCards(position([card('hearts', 5), card('spades', 12)], { tricks: 0, trick }))).toHaveLength(2)
  })
  test('hearts lead only once broken or with an only-hearts hand, queen never breaks', () => {
    const cards = [card('hearts', 2), card('diamonds', 2)]
    expect(legalCards(position(cards))).toEqual([card('diamonds', 2)])
    expect(legalCards(position(cards, { broken: true }))).toHaveLength(2)
    expect(legalCards(position([card('hearts', 2)]))).toHaveLength(1)
    const queen = position([card('spades', 12)], { trick: [{ seat: 3, card: card('diamonds', 7) }] })
    expect(playCard(queen, card('spades', 12).id).broken).toBe(false)
    const heart = position([card('hearts', 2)], { trick: [{ seat: 3, card: card('diamonds', 7) }] })
    expect(playCard(heart, card('hearts', 2).id).broken).toBe(true)
  })
  test('highest led suit including ace wins, winner leads and takes all penalties', () => {
    const trick = [{ seat: 1 as const, card: card('clubs', 13) }, { seat: 2 as const, card: card('clubs', 1) },
      { seat: 3 as const, card: card('spades', 12) }, { seat: 0 as const, card: card('hearts', 4) }]
    expect(trickWinner(trick)).toBe(2)
    const state = position([card('hearts', 4)], { trick: trick.slice(0, 3), turn: 0 })
    const next = playCard(state, card('hearts', 4).id)
    expect(next.turn).toBe(2)
    expect(next.points).toEqual([0, 0, 14, 0])
  })
  test('moon scores zero to shooter and 26 to others, game ends only after hand at 100, tied lowest share win', () => {
    expect(scoreHand([0, 26, 0, 0], [10, 20, 30, 40])).toEqual({ points: [26, 0, 26, 26], totals: [36, 20, 56, 66], moon: 1 })
    const trick = [{ seat: 1 as const, card: card('diamonds', 2) }, { seat: 2 as const, card: card('diamonds', 3) },
      { seat: 3 as const, card: card('diamonds', 4) }]
    const state = position([card('hearts', 7)], { tricks: 12, points: [10, 5, 10, 0], totals: [20, 20, 20, 99], trick })
    const end = playCard(state, card('hearts', 7).id)
    expect(end.phase).toBe('over')
    expect(end.rows[0].points).toEqual([10, 5, 10, 1])
    expect(end.totals).toEqual([30, 25, 30, 100])
    expect(winners([20, 20, 100, 80])).toEqual([0, 1])
  })
  test('score rows preserve per-hand points and cumulative totals across hands', () => {
    const row = scoreHand([3, 0, 10, 13], [10, 20, 30, 40])
    const state = { ...deal(10), rows: [row], totals: row.totals }
    const next = nextHand(state)
    expect(next.rows).toEqual([row])
    expect(next.totals).toEqual([13, 20, 40, 53])
    expect(next.points).toEqual([0, 0, 0, 0])
  })
})

describe('Standard Hearts AI', () => {
  test('dumps queen of spades while void', () => {
    const state = position([card('spades', 12), card('hearts', 13), card('diamonds', 1)], {
      trick: [{ seat: 3, card: card('clubs', 2) }]
    })
    expect(aiPlay(state)).toEqual(card('spades', 12))
  })
  test('completed public history alone establishes a late moon threat', () => {
    for (const [count, queen, expected] of [[0, true, null], [4, false, null], [5, false, 1],
      [7, true, null], [8, true, 1]] as const) {
      const state = position([], { tricks: 6, played: moonHistory(count, queen), points: [0, 26, 0, 0] })
      expect(visibleMoonThreat(state)).toBe(expected)
      expect(visibleMoonThreat(state, 1)).toBe(null)
      expect(visibleMoonThreat({ ...state, tricks: 5 })).toBe(null)
    }
    const played = moonHistory(5)
    // Another seat captures a penalty: the leader no longer owns every exposed penalty.
    played.push({ seat: 2, card: card('hearts', 1) }, { seat: 3, card: card('clubs', 10) },
      { seat: 0, card: card('clubs', 11) }, { seat: 1, card: card('clubs', 12) })
    expect(visibleMoonThreat(position([], { tricks: 7, played }))).toBe(null)
  })
  test('blocks only a real visible shooter currently winning a heart, not a lone queen', () => {
    const trick: Play[] = [{ seat: 1, card: card('clubs', 8) }, { seat: 2, card: card('hearts', 10) },
      { seat: 3, card: card('clubs', 7) }]
    const state = position([card('clubs', 3), card('clubs', 13)], {
      tricks: 6, played: [...moonHistory(8, true), ...trick], trick, points: [0, 21, 0, 0]
    })
    expect(aiPlay(state)).toEqual(card('clubs', 13))
    expect(aiPlay({ ...state, played: [...moonHistory(0, true), ...trick], points: [0, 13, 0, 0] })).toEqual(card('clubs', 3))
    expect(aiPlay({ ...state, tricks: 5 })).toEqual(card('clubs', 3))
    const otherWinner = [trick[0], trick[1], { seat: 3 as const, card: card('clubs', 9) }]
    expect(aiPlay({ ...state, trick: otherWinner, played: [...moonHistory(8, true), ...otherWinner] })).toEqual(card('clubs', 3))
  })
  test('in-progress penalties do not promote a seven-heart queen capture into a threat', () => {
    const trick: Play[] = [{ seat: 1, card: card('hearts', 10) }]
    expect(visibleMoonThreat(position([], { tricks: 6, played: [...moonHistory(7, true), ...trick], trick }))).toBe(null)
  })
  test('ducks queen when possible and never wins its own queen while a higher spade is legal', () => {
    const trick: Play[] = [{ seat: 1, card: card('spades', 2) }, { seat: 2, card: card('spades', 3) },
      { seat: 3, card: card('spades', 4) }]
    for (const count of [1, 3]) {
      expect(aiPlay(position([card('spades', 12), card('spades', 13), card('spades', 1)], {
        trick: trick.slice(0, count)
      }))).toEqual(card('spades', 1))
    }
    expect(aiPlay(position([card('spades', 3), card('spades', 12)], {
      trick: [{ seat: 3, card: card('spades', 8) }]
    }))).toEqual(card('spades', 3))
    expect(aiPlay(position([card('spades', 3), card('spades', 12)], {
      trick: [{ seat: 1, card: card('spades', 8) }, { seat: 2, card: card('spades', 6) },
        { seat: 3, card: card('spades', 7) }]
    }))).toEqual(card('spades', 3))
  })
  test('last seat sheds the highest nonqueen on a pointless trick, but ducks points', () => {
    const trick: Play[] = [{ seat: 1, card: card('clubs', 7) }, { seat: 2, card: card('clubs', 8) },
      { seat: 3, card: card('clubs', 9) }]
    const state = position([card('clubs', 3), card('clubs', 10), card('clubs', 1)], { trick })
    expect(aiPlay(state)).toEqual(card('clubs', 1))
    expect(aiPlay({ ...state, trick: [trick[0], trick[1], { seat: 3, card: card('hearts', 10) }] })).toEqual(card('clubs', 3))
  })
  test('keeps a legitimate nine-heart ace-and-control moon attempt', () => {
    const hearts = [1, 2, 3, 4, 5, 6, 7, 8, 13].map(rank => card('hearts', rank))
    const state = position([...hearts, card('clubs', 13), card('spades', 1)], {
      trick: [{ seat: 3, card: card('hearts', 10) }], broken: true
    })
    expect(aiPlay(state)).toEqual(card('hearts', 1))
  })
  test('passes high hearts, preserves low hearts with alternatives, and has a legal all-hearts fallback', () => {
    const hand = [card('hearts', 2), card('hearts', 8), card('hearts', 9), card('hearts', 10),
      card('hearts', 11), card('hearts', 12), card('hearts', 13)]
    expect(new Set(aiPass(hand))).toEqual(new Set([card('hearts', 11).id, card('hearts', 12).id, card('hearts', 13).id]))
    const allHearts = deck.filter(c => c.suit === 'hearts')
    const passed = aiPass(allHearts)
    expect(passed).toHaveLength(3)
    expect(new Set(passed).size).toBe(3)
    expect(passed.every(id => allHearts.some(c => c.id === id))).toBe(true)
    expect(aiPass([...hand].reverse())).toEqual(aiPass(hand))
    const forced = [card('hearts', 2), card('hearts', 3), card('hearts', 4), card('hearts', 8)]
    expect(aiPass(forced)).toHaveLength(3)
    const alternatives = [card('clubs', 2), card('clubs', 3), card('clubs', 4)]
    expect(new Set(aiPass([card('hearts', 2), card('hearts', 8), ...alternatives])))
      .toEqual(new Set(alternatives.map(c => c.id)))
  })
  test('voids a complete short club or diamond suit ahead of middle hearts, never a partial pair', () => {
    const hand = [card('clubs', 3), card('clubs', 4), card('diamonds', 5), card('diamonds', 6),
      card('hearts', 9), card('hearts', 10)]
    const passed = aiPass(hand)
    expect(passed).toContain(card('diamonds', 5).id)
    expect(passed).toContain(card('diamonds', 6).id)
    expect(passed).toContain(card('hearts', 10).id)
    const singleton = [card('clubs', 3), card('diamonds', 5), card('hearts', 9), card('hearts', 10)]
    expect(aiPass(singleton)).toContain(card('clubs', 3).id)
    expect(aiPass(singleton)).toContain(card('diamonds', 5).id)
    expect(aiPass([card('clubs', 2), card('hearts', 9), card('hearts', 10), card('hearts', 11)]))
      .not.toContain(card('clubs', 2).id)
  })
  test('passes vulnerable high spades but keeps a queen protected by three low spades', () => {
    const highSpades = [card('spades', 12), card('spades', 13), card('spades', 1)]
    const hearts = [card('hearts', 11), card('hearts', 12), card('hearts', 13)]
    expect(new Set(aiPass([...highSpades, ...hearts]))).toEqual(new Set(highSpades.map(c => c.id)))
    expect(aiPass([...highSpades, card('spades', 2), card('spades', 3), card('spades', 4), ...hearts]))
      .not.toContain(card('spades', 12).id)
  })
  test('one thousand seeded full random games contain no illegal AI plays', () => {
    for (let seed = 0; seed < 1000; seed++) {
      let state = deal(seed * 104729)
      let hands = 0
      while (state.phase !== 'over') {
        if (state.phase === 'pass') state = acknowledge(passCards(state, state.hands.map(aiPass)))
        while (state.phase === 'play') {
          const choice = aiPlay(state)
          expect(legalCards(state).some(card => card.id === choice.id)).toBe(true)
          const next = playCard(state, choice.id)
          expect(next).not.toBe(state)
          state = next
        }
        expect(state.played).toHaveLength(52)
        expect(state.points.reduce((sum, p) => sum + p, 0)).toBe(26)
        expect(state.hands.every(hand => hand.length === 0)).toBe(true)
        hands++
        expect(hands).toBeLessThan(1000)
        if (state.phase !== 'over') state = nextHand(state)
      }
      expect(state.totals.some(p => p >= 100)).toBe(true)
    }
  }, 120000)
})

describe('Hearts presentation geometry', () => {
  test('Pocket uses all available height, native cards, clear control and score bands, and 48px portrait origins', () => {
    for (const width of [320, 390, 719]) {
      for (const height of [500, 600, 760]) {
        const layout = heartsLayout(width, height, true, 13)
        expect([layout.width, layout.height, layout.scale, layout.ox, layout.oy]).toEqual([width, height, 1, 0, 0])
        expect(layout.hand.viewport.width).toBe(width - 16)
        expect(layout.hand.viewport.height).toBe(111)
        expect(layout.hand.y + 96).toBe(height - 8)
        expect(layout.hand.y - 15).toBe(layout.hand.viewport.y)
        expect(layout.pass.height).toBe(44)
        expect(layout.score.height).toBe(44)
        expect(layout.pass.y + layout.pass.height).toBeLessThan(layout.score.y)
        expect(layout.score.y + layout.score.height).toBeLessThan(layout.hand.viewport.y)
        for (const point of layout.centers) {
          expect(point.x).toBeGreaterThanOrEqual(0)
          expect(point.x + 71).toBeLessThanOrEqual(width)
          expect(point.y).toBeGreaterThanOrEqual(116)
          expect(point.y + 96).toBeLessThanOrEqual(layout.pass.y - 12)
        }
        for (const seat of [1, 2, 3]) {
          expect(layout.plates[seat].width).toBeGreaterThanOrEqual(48)
          expect(layout.seats[seat]).toEqual({ x: layout.plates[seat].x + layout.plates[seat].width / 2, y: 32 })
        }
      }
    }
  })

  test('wide-short canonical Pocket keeps native trick cards between horizontal plates and the hand', () => {
    for (const height of [300, 318]) {
      const layout = heartsLayout(844, height, true, 13)
      expect(layout.wideShort).toBe(true)
      expect(layout.compactTrick).toBe(true)
      expect(layout.scale).toBe(1)
      expect(layout.plates.slice(1).every(plate => plate.height === 48)).toBe(true)
      expect(layout.score.width).toBe(180)
      expect(layout.pass.width).toBe(120)
      expect(layout.score.height).toBe(44)
      expect(layout.pass.height).toBe(44)
      expect(layout.score.y).toBe(layout.pass.y)
      expect(layout.pass.y + 44).toBeLessThanOrEqual(layout.hand.viewport.y)
      for (const point of layout.centers) {
        expect(point.y).toBe(64)
        expect(point.y + 96 + 15).toBeLessThanOrEqual(layout.hand.viewport.y)
        for (const rect of [...layout.plates.slice(1), layout.score, layout.pass]) {
          expect(point.x < rect.x + rect.width && point.x + 71 > rect.x &&
            point.y < rect.y + rect.height && point.y + 96 > rect.y).toBe(false)
        }
      }
      expect(Number.isInteger(layout.hand.start)).toBe(true)
      expect(Number.isInteger(layout.hand.step)).toBe(true)
    }
  })

  test('tall Pocket and desktop crosses preserve the North and South card indices without overlap', () => {
    for (const layout of [heartsLayout(390, 760, true, 13), heartsLayout(640, 432, false, 13)]) {
      expect(layout.compactTrick).toBe(false)
      expect(layout.centers[0].y).toBeGreaterThanOrEqual(layout.centers[2].y + 96)
      expect(layout.centers[1].y).toBeGreaterThan(layout.centers[2].y)
      expect(layout.centers[3].y).toBe(layout.centers[1].y)
      expect(Number.isInteger(layout.hand.start)).toBe(true)
    }
    expect(heartsLayout(640, 432, false, 13).centers.map(point => point.y)).toEqual([216, 168, 120, 168])
  })

  test('short Pocket surfaces keep all four trick cards fully readable in a native row clear of portraits and Pass', () => {
    for (const width of [320, 390]) {
      for (const height of [432, 448, 468]) {
        const layout = heartsLayout(width, height, true, 13)
        expect(layout.compactTrick).toBe(true)
        const cards = layout.centers.slice().sort((a, b) => a.x - b.x)
        for (let i = 0; i < cards.length; i++) {
          expect(cards[i].x).toBeGreaterThanOrEqual(8)
          expect(cards[i].x + 71).toBeLessThanOrEqual(width - 8)
          expect(cards[i].y).toBeGreaterThanOrEqual(108)
          expect(cards[i].y + 96).toBeLessThanOrEqual(layout.pass.y - 6)
          expect(cards[i].y + 97 + 11).toBeLessThan(layout.pass.y)
          if (i) expect(cards[i].x).toBeGreaterThanOrEqual(cards[i - 1].x + 71)
        }
      }
    }
  })

  test('every card has a genuinely exposed >=32px selectable strip reachable by horizontal scrolling, including raised cards', () => {
    for (const width of [320, 390]) {
      for (let count = 1; count <= 13; count++) {
        const cards = deck.slice(0, count)
        const initial = heartsLayout(width, 600, true, count)
        for (let depth = 0; depth < count; depth++) {
          const scroll = handScrollForCard(initial, depth, count)
          const layout = heartsLayout(width, 600, true, count, scroll)
          for (const raised of [false, true]) {
            const target = handCardTarget(layout, depth, count, raised)
            expect(target.width).toBeGreaterThanOrEqual(32)
            expect(target.height).toBe(96)
            expect(target.x).toBeGreaterThanOrEqual(layout.hand.viewport.x)
            expect(target.x + target.width).toBeLessThanOrEqual(layout.hand.viewport.x + layout.hand.viewport.width + .000001)
            expect(hitHand(layout, cards, raised ? [cards[depth].id] : [], target.x + target.width / 2, target.y + 32)).toBe(depth)
            expect(handCardPosition(layout, depth, raised)).toEqual({ x: target.x, y: target.y })
          }
        }
        expect(hitHand(initial, cards, [], 0, initial.hand.y + 32)).toBe(-1)
        expect(hitHand(initial, cards, [], width, initial.hand.y + 32)).toBe(-1)
      }
    }
  })

  test('13-card narrow fans scroll, shortened and wide fans fit, scroll is clamped and arrows can return to the first card', () => {
    for (const width of [320, 390]) {
      const first = heartsLayout(width, 600, true, 13)
      expect(first.hand.step).toBe(32)
      expect(first.hand.contentWidth).toBe(455)
      const end = heartsLayout(width, 600, true, 13, handScrollForCard(first, 12, 13))
      expect(end.hand.scroll).toBe(455 - (width - 16))
      expect(handCardPosition(end, 12).x + 71).toBe(width - 8)
      expect(handScrollForCard(end, 0, 13)).toBe(0)
      expect(heartsLayout(width, 600, true, 13, 9999).hand.scroll).toBe(end.hand.scroll)
      const short = heartsLayout(width, 600, true, 8, end.hand.scroll)
      expect(short.hand.contentWidth).toBeCloseTo(short.hand.viewport.width)
      expect(short.hand.scroll).toBeCloseTo(0)
    }
    const wide = heartsLayout(719, 600, true, 13)
    expect(wide.hand.contentWidth).toBe(wide.hand.viewport.width)
    expect(wide.hand.scroll).toBe(0)
  })

  test('desktop preserves the 14px South fan and keeps all opponent plates outside normal and peek fans', () => {
    const layout = heartsLayout(640, 432, false, 13)
    expect([layout.width, layout.height, layout.scale]).toEqual([640, 432, 1])
    expect(layout.hand.step).toBe(14)
    expect(layout.hand.y).toBe(328)
    for (const peek of [false, true]) {
      for (const seat of [1, 2, 3]) {
        const length = 71 + (peek ? 14 : 5) * 12
        const origin = layout.seats[seat]
        const fan: Rect = seat === 2 ? { x: origin.x - length / 2, y: origin.y - 48, width: length, height: 96 } :
          { x: origin.x - 48, y: origin.y - length / 2, width: 96, height: length }
        for (const plate of layout.plates.slice(1)) {
          expect(fan.x < plate.x + plate.width && fan.x + fan.width > plate.x &&
            fan.y < plate.y + plate.height && fan.y + fan.height > plate.y).toBe(false)
        }
        expect(fan.x).toBeGreaterThanOrEqual(0)
        expect(fan.y).toBeGreaterThanOrEqual(0)
        expect(fan.x + fan.width).toBeLessThanOrEqual(640)
        expect(fan.y + fan.height).toBeLessThanOrEqual(432)
        for (const depth of [0, 6, 12]) {
          const offset = opponentFanOffset(depth, 13, peek) + 71 / 2
          expect(opponentCardOrigin(layout, seat, depth, 13, peek)).toEqual({
            x: origin.x - 71 / 2 + (seat === 2 ? offset : 0),
            y: origin.y - 48 + (seat === 1 ? offset : seat === 3 ? -offset : 0)
          })
        }
      }
    }
    const point = handCardPosition(layout, 4)
    const fitted = heartsLayout(800, 560, false, 13)
    expect(hitHand(fitted, deck.slice(0, 13), [], (point.x + 7) * fitted.scale + fitted.ox,
      (point.y + 32) * fitted.scale + fitted.oy)).toBe(4)
  })

  test('moon paths originate from the same seats as play and collection animation endpoints', () => {
    for (const layout of [heartsLayout(640, 432, false, 13), heartsLayout(320, 600, true, 13)]) {
      for (let seat = 0; seat < 4; seat++) {
        expect(moonPath(layout, seat).startsWith(`path('M ${layout.seats[seat].x} ${layout.seats[seat].y} Q `)).toBe(true)
        expect(moonPath(layout, seat).endsWith(`${layout.width - 36} ${layout.pocket ? 84 : 112}')`)).toBe(true)
      }
    }
  })
})

describe('Hearts presentation copy', () => {
  const names = ['You', 'SHORT', 'ADMIN ESCROW', 'SQUEEZE']
  test('trick announcements use take for South and takes for current opponent names', () => {
    expect(trickMessage('You', 0)).toBe('You take the trick.')
    expect(trickMessage('SHORT', 1)).toBe('SHORT takes the trick.')
    expect(trickMessage('ADMIN ESCROW', 2)).toBe('ADMIN ESCROW takes the trick.')
    expect(trickMessage('Prof. Gwei', 3)).toBe('Prof. Gwei takes the trick.')
  })
  test('compact trick seat tags use current first-word opponent names and preserve You for South', () => {
    expect(trickSeatLabel('You', 0)).toBe('You')
    expect(trickSeatLabel('ADMIN ESCROW', 2)).toBe('ADMIN')
    expect(trickSeatLabel(' Prof. Gwei ', 1)).toBe('Prof.')
    expect(trickSeatLabel('SQUEEZE', 3)).toBe('SQUEEZE')
  })
  test('South uses win and a single opponent uses wins with its current name', () => {
    expect(rankingMessage([0, 20, 30, 100], names)).toBe('You win the game!')
    expect(rankingMessage([20, 0, 30, 100], names)).toBe('SHORT wins the game!')
    expect(rankingMessage([20, 30, 0, 100], ['You', 'SHORT', 'Prof. Gwei', 'SQUEEZE'])).toBe('Prof. Gwei wins the game!')
  })
  test('two, three and four lowest scores explicitly share the win with correct names and grammar', () => {
    expect(rankingMessage([0, 0, 30, 100], names)).toBe('You and SHORT share the win!')
    expect(rankingMessage([20, 0, 0, 100], names)).toBe('SHORT and ADMIN ESCROW share the win!')
    expect(rankingMessage([0, 0, 0, 100], names)).toBe('You, SHORT, and ADMIN ESCROW share the win!')
    expect(rankingMessage([100, 100, 100, 100], names)).toBe('You, SHORT, ADMIN ESCROW, and SQUEEZE share the win!')
  })
})
