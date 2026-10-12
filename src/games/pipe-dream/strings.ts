export const strings = {
  title: 'Pipe Dream', start: 'Lay pipe before the liquidity flows', flavour: 'Nobody drained anything. There is no Cabald.',
  game: '&Game', options: '&Options', help: '&Help', new: '&New', enterPassword: 'Enter &Password…', pauseMenu: '&Pause',
  fastMenu: '&Fast Flow', highScores: '&High Scores…', exit: 'E&xit', sound: '&Sound', grid: 'Show &Grid Lines',
  contents: '&Contents', about: '&About Pipe Dream…', version: '5.1 (Build 2600.remy_sp2.4490)',
  accelerators: { new: 'F2', pause: 'F3', fast: 'F', help: 'F1' },
  credits: ['Remade for the Remy Boys community, 2026.', 'After Pipe Mania (1989) by The Assembly Line; Pipe Dream for Windows by Lucasfilm Games / Microsoft Entertainment Pack.',
    'This product is licensed to: Remy Boy', 'Remys available to Remy OS: 4,490'],
  level: 'Level', score: 'Score', distance: 'Distance', bonusDistance: '--', countdown: 'Flow countdown', fast: '▶▶', fastLabel: 'Fast Flow', pause: 'Pause',
  resume: 'Resume', paused: 'Paused. The liquidity waits.', boardCovered: 'Playfield covered.', next: 'Next', dispenser: 'Dispenser — highlighted piece is next',
  vault: 'Vault', pool: 'Pool', bridge: 'C', portalLabels: ['A', 'B'],
  block: 'This block does not exist.', reservoir: 'Liquidity Pool', valve: 'Escrow valve', pass: 'Liquidity provided!',
  fail: 'Liquidity drained. Nobody drained anything.', bonus: 'BONUS ROUND: REORG THE PIPES', bonusEnd: 'Bonus round complete.',
  drainPass: 'Liquidity provided! Distance met. Pool bonus: 1,000 points.',
  drainShort: 'Liquidity drained. Nobody drained anything. Pool bonus: 1,000 points. Distance was not met.',
  fiveCrosses: 'Five crossovers! +10,000', continue: 'Continue', newGame: 'New Game', passwordTitle: 'Enter Password',
  passwordPrompt: 'Type the 4-letter password:', invalidPassword: 'That password is not valid.', passwords: 'Earned passwords',
  passwordGiven: (word: string) => `Your password is: ${word}`, noPasswords: 'Complete a bonus round to earn a password.',
  ok: 'OK', cancel: 'Cancel', helpTitle: 'Pipe Dream Help', helpTabs: ['Rules', 'Scoring', 'Keyboard', 'Tips'],
  helpPages: [
    [
      'Click or tap an empty cell to place the next pipe. Pieces cannot be rotated. Next is at the bottom of the dispenser, or the left on Pocket. '
        + 'Select an unfilled pipe again to replace it; wait for the debris to settle. Fixed, flowing and filled pipes cannot be replaced.',
      'Route liquidity from the Vault through open pipe ends. A Crossover has two separate paths. Meet Distance before flow stops, even at the Pool. '
        + 'From Level 13, matching edge letters carry flow across the board.',
      'After every fourth level, slide a pipe beside the gap; the Vault stays fixed. Bonus flow starts after 15 seconds. '
        + 'The bonus gives a four-letter password for the next level. Entering it starts with a score of zero.'
    ],
    [
      'Each filled section scores 50 points. Fast Flow doubles section points. Sections beyond Distance also score double; both multipliers apply together.',
      'A second trip through a Crossover, along its other path, adds 500 points. Five completed crossovers add 10,000 points. '
        + 'A Liquidity Pool takes three times as long to fill and adds 200 points. Reaching the Pool adds 1,000 points, even if Distance has not been met. '
        + 'The Pool bonus does not pass a short route.',
      'Replacing a pipe costs 50 points. Each unused placed pipe costs 100 points when the level ends. '
        + 'Bonus rounds score 100 points per section, with no unused-pipe deductions. The ten highest scores are saved.'
    ],
    [
      'Arrow keys move the yellow cell cursor. Space places or replaces a pipe, or slides a bonus-round pipe. F selects Fast Flow for the rest of the level. '
        + 'F2 starts a new game. F3 pauses or resumes. F1 opens Help. Alt or F10 activates the menu bar.',
      'Select Continue after a completed level. Select New Game after a failed level. Any click or key ends a level-end celebration.',
      'Losing focus pauses play. Select Resume to continue. Pause, menus and dialogs cover the pipes and dispenser.'
    ],
    [
      'Plan a long route from the Vault before adding side branches. Read the dispenser from bottom to top, or from left to right on Pocket. '
        + 'Use both paths through a Crossover to earn its bonus.',
      'An Escrow valve accepts flow only in the direction of its arrow. A Liquidity Pool allows more time to place pipes. '
        + 'Do not route straight to the Pool unless Distance is already met. Unofficial bridge fragments remain obstacles, despite their reports.'
    ]
  ],
  scoresTitle: 'Pipe Dream High Scores', scoresHeading: 'Top Ten Pipe Layers', recordTitle: 'New High Score',
  scoreHeadings: { label: 'Rank', name: 'Name', detail: 'Level', score: 'Score' }, noScore: '–',
  recordMessage: 'Enter your name for the high-score table.', points: (value: number) => `${value.toLocaleString()} points`,
  scoreValue: (value: number) => value.toLocaleString(),
  sections: 'Sections', crossovers: 'Crossovers', unused: 'Unused Pipes',
  unusedTally: (count: number) => `${count} (${(count === 0 ? 0 : -count * 100).toLocaleString()} points)`,
  rank: (rank: number) => `${rank}`,
  levelAnnouncement: (level: number, distance: number) => `Level ${level} · Distance ${distance}`,
  scoreAnnouncement: (score: number, distance: number | null) =>
    distance === null ? `Score ${score}.` : `Score ${score}. Distance remaining ${distance}.`,
  selectedCell: (column: number, row: number, piece: string) => `Column ${column}, row ${row}: ${piece}.`,
  pieceNames: {
    empty: 'Empty', horizontal: 'Horizontal', vertical: 'Vertical', ne: 'North-east elbow', se: 'South-east elbow', sw: 'South-west elbow',
    nw: 'North-west elbow', cross: 'Crossover', source: 'Vault', block: 'Unofficial bridge fragment', 'reservoir-h': 'Liquidity Pool, horizontal',
    'reservoir-v': 'Liquidity Pool, vertical', 'valve-n': 'Escrow valve, north', 'valve-e': 'Escrow valve, east', 'valve-s': 'Escrow valve, south',
    'valve-w': 'Escrow valve, west', drain: 'Pool'
  }
}
