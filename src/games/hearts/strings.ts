import { winners } from './engine'

export const S = {
  title: 'The Remy Hearts Network', south: 'You', defaults: ['SHORT', 'ADMIN ESCROW', 'SQUEEZE'],
  game: '&Game', help: '&Help', new: '&New Game', score: '&Score…', options: '&Options…', deck: '&Deck…', exit: 'E&xit',
  contents: '&Contents', about: '&About Hearts…', confirm: 'Do you want to end the current game?', yes: 'Yes', no: 'No', ok: 'OK', cancel: 'Cancel',
  speed: 'Animation speed', speeds: ['Slow', 'Normal', 'Fast'], players: 'Computer players', sound: 'Sound', standard: 'Standard',
  seats: ['West', 'North', 'East'],
  pass: { left: 'Pass Left', right: 'Pass Right', across: 'Pass Across', hold: 'No pass' } as Record<string, string>,
  select: 'Select exactly three cards to pass.', received: 'These are the cards you received. Choose OK to continue.',
  turn: 'Your turn.', waiting: 'Thinking…', illegal: 'That card cannot be played.', nice: 'Nice try.',
  house: 'There is no Cabald. I love you.', broken: 'Hearts broken. We still love you.', queen: 'Plausible deniability.',
  zero: 'Matching capes. Matching losses.', blocked: 'Not today, Hopium.', rugged: 'RUGGED', moon: 'TO THE MOON',
  sheet: 'Score Sheet', hand: 'Hand', total: 'Total', next: 'Next Hand', ranking: 'Game Over',
  played: 'played', peek: 'Opponent peek', version: '5.1 (Build 2600.remy_sp2.4490)',
  cards: 'cards', handViewport: 'Your hand. Swipe horizontally to reach every card.', panHand: 'Swipe hand · ←/→',
  previousCards: 'Show previous cards in your hand', nextCards: 'Show next cards in your hand',
  flavour: 'There is no Cabald. I love you. ♥',
  credits: ['Remade for the Remy Boys community, 2026.', 'After Microsoft Hearts (Windows for Workgroups 3.1, 1992) by Microsoft.',
    'This product is licensed to: Remy Boy', 'Remys available to Remy OS: 4,490'],
  helpTitle: 'The Remy Hearts Network',
  sections: {
    Rules: 'Each player receives thirteen cards. Pass three cards left, right, across, then hold on successive hands. The two of clubs leads. Follow suit whenever possible. On the first trick, discard a heart or the queen of spades only if no other card is available. Hearts cannot be led before a heart is played, unless you hold only hearts. The queen of spades does not break hearts. The highest card of the led suit wins.',
    Scoring: 'Each heart scores one point. The queen of spades scores thirteen points. Taking all twenty-six points shoots the moon: you score zero and each opponent scores twenty-six. At the end of a hand with a total of one hundred or more, the lowest total wins. Equal lowest totals share the win. Press F3 for the hand-by-hand score sheet.',
    Keyboard: 'Use Left and Right to move through your hand. On Pocket the fan scrolls to keep the selected card visible. Space selects a card for passing or plays it. Enter confirms a pass or acknowledges received cards. F2 starts a new game, F3 opens the score sheet, and F1 opens Help. Ctrl+Alt+Shift+F12 shows or hides opponents’ cards. Any key or click skips a moon celebration.',
    Tips: 'Pass dangerous high spades when your spade suit is short. Create a void so you can discard point cards. Keep low cards to duck tricks. Watch exposed cards and interrupt a moon attempt by taking one heart. On Pocket, swipe your hand horizontally to reach every card. Tap once to raise a card and again to play it. There is no Cabald.'
  }
}

export function rankingMessage(totals: readonly number[], names: readonly string[]): string {
  const seats = winners(totals)
  const subjects = seats.map(seat => names[seat])
  if (seats.length > 1) {
    const joined = subjects.length === 2 ? subjects.join(' and ') : `${subjects.slice(0, -1).join(', ')}, and ${subjects[subjects.length - 1]}`
    return `${joined} share the win!`
  }
  return `${subjects[0]} ${seats[0] === 0 ? 'win' : 'wins'} the game!`
}

/** Compact trick rows retain the seat cue after abandoning the spatial diamond. */
export function trickSeatLabel(name: string, seat: number): string {
  return seat === 0 ? S.south : name.trim().split(/\s+/)[0]
}

export function trickMessage(name: string, seat: number): string {
  return `${name} ${seat === 0 ? 'take' : 'takes'} the trick.`
}
