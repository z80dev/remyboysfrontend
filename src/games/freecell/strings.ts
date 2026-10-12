export const S = {
  title: 'FreeCell', caption: (n: number) => `FreeCell Game #${String(n).replace('-', '−')}`, cards: (n: number) => `Cards Left: ${n}`,
  new: '&New Game', select: '&Select Game…', restart: '&Restart Game', stats: '&Statistics…', options: '&Options…', undo: '&Undo', deck: '&Deck…', exit: 'E&xit',
  game: '&Game', help: '&Help', contents: '&Contents', about: '&About FreeCell…', sound: '&Sound', player: 'Choose Your &Remy…',
  win: 'Congratulations, you win! Do you want to play again?', loss: 'There are no more legal moves. Sorry, you lose. Do you want to play again?',
  resign: 'Do you want to resign this game?', illegal: 'That move is not allowed.', same: 'Same game', yes: 'Yes', no: 'No', ok: 'OK', cancel: 'Cancel',
  column: 'Move column', single: 'Move single card', empty: 'Move the selected column or only its bottom card?',
  numberTitle: 'Game Number', statsTitle: 'FreeCell Statistics',
  number: 'Game Number:', range: '(1 to 32000)', validation: 'Enter a game number from 1 to 32000.',
  illegalOption: 'Display messages on illegal moves', quick: 'Quick play (no animation)', double: 'Double-click moves card to free cell',
  session: 'This session', total: 'Total', streaks: 'Streaks', won: 'Won', lost: 'Lost', percent: 'Win percentage', wins: 'Wins', losses: 'Losses',
  current: 'Current', clear: 'Clear', clearConfirm: 'Are you sure you want to clear the statistics?',
  currentStreak: (n: number) => `${Math.abs(n)} ${n < 0 ? Math.abs(n) === 1 ? 'Loss' : 'Losses' : n === 1 ? 'Win' : 'Wins'}`,
  cheat: 'User-Friendly User Interface', cheatText: 'Choose Abort to Win, Retry to Lose, or Ignore to Cancel.', abort: 'Abort', retry: 'Retry', ignore: 'Ignore',
  flavour: 'Game #11982 knows what it did.', version: '5.1 (Build 2600.remy_sp2.4490)',
  aboutLines: ['Remade for the Remy Boys community, 2026.', 'After Microsoft FreeCell (1991) by Jim Horne.',
    'This product is licensed to: Remy Boy', 'Remys available to Remy OS: 4,490'],
  special: (n: number) => n === 11982 ? "Even the Cabald can't win this one." : n === -1 ? 'There is no Game #−1. I love you.' : n === -2 ? 'Game #−2 does not exist either.' : '',
  selected: (name: string) => `Selected ${name}.`, moved: (n: number) => `Move completed. ${n} cards left.`, started: (n: number) => `Game ${n} dealt.`,
  application: 'FreeCell card table. Use 1 through 8 for columns, Q W E R for free cells, H for home.',
  helpTitle: 'FreeCell Help',
  sections: {
    Rules: 'Move all cards to the four home cells, in each suit from Ace to King. An Ace may start any empty home cell. Build columns downward in alternating colors. Any card may occupy an empty column or free cell. To move a group of cards, leave enough free cells and empty columns to move them one at a time. Cards that are no longer needed in the columns move home automatically. The King is watching.',
    Scoring: 'There is no point score. Statistics record games won and lost, and winning and losing streaks. Resigning a game after making a move counts as a loss. Restart deals the same game again. Undo restores your last move, including any cards moved home automatically. The King keeps an honest ledger.',
    Keyboard: 'Press 1 through 8 to select a column, then press the destination key to move its cards. Q, W, E, and R select the free cells. H moves the selected column’s exposed card home. For an empty column, choose Move column or Move single card. Use the arrow keys to move the dotted outline or choose a card within a column. Space or Enter selects a card or destination. Escape cancels the selection. F1 opens Help; F2 starts a new game; F3 selects a game number; F4 opens Statistics; F5 opens Options; F10 undoes a move. The King does not need a keyboard.',
    Tips: 'Keep free cells empty whenever possible. Expose Aces and small cards before moving long groups. Click an exposed card to select its group, then click the destination. Click a covered card or drag to choose a specific group. Hold the right mouse button on a covered card to see it. Double-click or touch and hold an exposed card to send it to a free cell. If the free cells are full, a double-click may send the card home. On a small screen, use Earlier card and Later card to select covered cards when the columns are crowded. Game #11982 knows what it did.'
  }
}
