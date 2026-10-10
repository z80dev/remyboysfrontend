export const S = {
  title: 'FreeCell', caption: (n: number) => `FreeCell Game #${n}`, cards: (n: number) => `Cards Left: ${n}`,
  new: '&New Game', select: '&Select Game…', restart: '&Restart Game', stats: '&Statistics…', options: '&Options…', undo: '&Undo', deck: '&Deck…', exit: 'E&xit',
  game: '&Game', help: '&Help', contents: '&Contents', about: '&About FreeCell…', sound: '&Sound', player: 'Choose Your Remy…',
  win: 'Congratulations, you win! Do you want to play again?', loss: 'There are no more legal moves. Sorry, you lose. Do you want to play again?',
  resign: 'Do you want to resign this game?', illegal: 'That move is not allowed.', same: 'Same game', yes: 'Yes', no: 'No', ok: 'OK', cancel: 'Cancel',
  column: 'Move column', single: 'Move single card', empty: 'Move the selected column or only its bottom card?',
  number: 'Game Number:', range: '(1 to 32000)', validation: 'Enter a game number from 1 to 32000, −1, or −2.',
  illegalOption: 'Display messages on illegal moves', quick: 'Quick play (no animation)', double: 'Double-click moves card to free cell',
  session: 'This session', total: 'Total', streaks: 'Streaks', won: 'Won', lost: 'Lost', percent: 'Win percentage', wins: 'Wins', losses: 'Losses',
  current: 'Current', clear: 'Clear', clearConfirm: 'Are you sure you want to clear the statistics?',
  cheat: 'User-Friendly User Interface', cheatText: 'Choose Abort to Win, Retry to Lose, or Ignore to Cancel.', abort: 'Abort', retry: 'Retry', ignore: 'Ignore',
  flavour: 'Game #11982 knows what it did.', version: '5.1 (Build 2600.remy_sp2.4490)',
  aboutLines: ['Remade for the Remy Boys community, 2026.', 'After Microsoft FreeCell (1991) by Jim Horne.',
    'This product is licensed to: Remy Boy', 'Remys available to Remy OS: 4,490'],
  special: (n: number) => n === 11982 ? "Even the Cabald can't win this one." : n === -1 ? 'There is no Game #−1. I love you.' : n === -2 ? 'Game #−2 does not exist either.' : '',
  selected: (name: string) => `Selected ${name}.`, moved: (n: number) => `Move completed. ${n} cards left.`, started: (n: number) => `Game ${n} dealt.`,
  application: 'FreeCell card table. Use 1 through 8 for columns, Q W E R for free cells, H for home.',
  helpTitle: 'FreeCell Help',
  sections: {
    Rules: 'Move all cards to the four home cells, by suit from Ace to King. Build cascades downward in alternating colors. Any card may occupy an empty cascade or free cell. A sequence uses (1 + empty free cells) × 2 to the power of empty cascades; an empty destination does not count. Safe cards go home automatically.',
    Scoring: 'There is no point score. Statistics count won and lost games and consecutive streaks. Resigning an unfinished game counts as a loss. Restart repeats the same deal. Undo restores the move and all automatic home moves together.',
    Keyboard: '1–8 select or target cascades. Q W E R select or target free cells. H sends the selected card home. Arrow keys move the dotted cursor; Space or Enter selects or targets. Escape deselects. F1 Help, F2 New Game, F3 Select Game, F4 Statistics, F5 Options, F10 Undo.',
    Tips: 'Keep free cells empty whenever possible. Expose Aces and small cards before moving long sequences. Double-click or long-press sends a card to a free cell; when all are occupied, double-click can send it home. Game #11982 knows what it did.'
  }
}
