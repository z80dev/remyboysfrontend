export const S = {
  title: 'Spider Solitaire', start: 'Eight runs, ten piles, zero Cabald',
  empty: 'You are not allowed to deal a new row while there are any empty slots.', none: 'There are no more moves available.',
  offer: 'There are no more available moves. Would you like to deal a new row?', saveExit: 'Do you want to save this game?',
  won: 'Congratulations, you won! Would you like to start another game?', difficultyPrompt: 'Changing the difficulty will start a new game. Continue?',
  reset: 'Are you sure you want to reset the statistics?', missing: 'There is no saved game to open.', saved: 'The game has been saved.',
  invalid: 'That run cannot be moved there.', new: 'A new game has been dealt.', opened: 'The saved game has been opened.',
  yes: 'Yes', no: 'No', cancel: 'Cancel', ok: 'OK', deal: 'Deal', score: 'Score', moves: 'Moves',
  game: '&Game', help: '&Help', newGame: '&New Game', restart: '&Restart This Game', undo: '&Undo', dealRow: '&Deal Next Row', hint: 'Show an Available &Move',
  difficulty: '&Difficulty…', stats: '&Statistics…', options: '&Options…', save: '&Save This Game', open: '&Open Last Saved Game', deck: 'Dec&k…', exit: 'E&xit',
  contents: '&Contents', about: '&About Spider Solitaire…', difficultyTitle: 'Difficulty', statsTitle: 'Statistics', optionsTitle: 'Options',
  difficulties: { 1: 'Easy: One Suit', 2: 'Medium: Two Suits', 4: 'Difficult: Four Suits' }, sounds: 'Play sounds', animation: 'Show animation on deal',
  prompt: 'Prompt to save game on exit', alwaysSave: 'Always save game on exit', alwaysOpen: 'Always open saved game',
  high: 'High score', wins: 'Wins', losses: 'Losses', rate: 'Win rate', longestWin: 'Longest winning streak', longestLoss: 'Longest losing streak', streak: 'Current streak',
  resetButton: 'Reset', savedTitle: 'Save This Game', helpTitle: 'Spider Solitaire Help',
  flavour: 'Eight legs. Eight runs. Coincidence? There is no Cabald.',
  aboutLines: ['Remade for the Remy Boys community, 2026.', 'After Microsoft Spider Solitaire (1998, Windows Plus! 98 / Windows Me / XP).',
    'This product is licensed to: Remy Boy', 'Remys available to Remy OS: 4,490'],
  helpSections: {
    Rules: 'Build descending sequences. A card may be placed on a card one rank higher, regardless of suit. Move a sequence only when all its cards have the same suit. Empty piles accept any card or suited sequence. Complete a suited King-to-Ace sequence to remove it. Deal only when every pile contains a card. Remove eight sequences to win. In Easy, everyone is the Cabald. There is no Cabald.',
    Scoring: 'Begin with 500 points. Each move, deal, and undo costs one point. Each completed sequence adds 100 points. You cannot undo past a completed sequence. Statistics are kept separately for each difficulty.',
    Keyboard: 'Left and Right select a pile. Up and Down select a depth in a movable sequence. Space picks up or drops. Escape cancels. D deals. M cycles available moves. Ctrl+Z undoes. Ctrl+S saves. Ctrl+O opens. F1 Help; F2 New Game; F3 Difficulty; F4 Statistics; F5 Options.',
    Tips: 'Expose face-down cards and build same-suit sequences. Keep an empty pile available for rearranging, then fill it before dealing. Tap a run and then a destination, or drag it. Hold a pile to show an available move from that pile. Restart repeats the same shuffle.'
  },
  pile: (p: number) => `Pile ${p + 1}`, selected: (p: number, depth: number) => `Pile ${p + 1}, card ${depth + 1} selected.`,
  moved: (from: number, to: number, score: number) => `Moved from pile ${from + 1} to pile ${to + 1}. Score: ${score}.`,
  completed: (count: number) => `${count} of eight runs completed.`, hintText: (from: number, to: number) => `Move from pile ${from + 1} to pile ${to + 1}.`,
  stock: (rows: number) => `Deal next row. ${rows} rows remaining.`
}
