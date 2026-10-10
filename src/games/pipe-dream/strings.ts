export const strings = {
  title: 'Pipe Dream', start: 'Lay pipe before the liquidity flows', flavour: 'Nobody drained anything. There is no Cabald.',
  game: '&Game', options: '&Options', help: '&Help', new: '&New', enterPassword: 'Enter &Password…', pauseMenu: '&Pause',
  fastMenu: '&Fast Flow', highScores: '&High Scores…', exit: 'E&xit', sound: '&Sound', grid: 'Show &Grid Lines',
  contents: '&Contents', about: '&About Pipe Dream…', version: '5.1 (Build 2600.remy_sp2.4490)',
  credits: ['Remade for the Remy Boys community, 2026.', 'After Pipe Mania (1989) by The Assembly Line; Pipe Dream for Windows by Lucasfilm Games / Microsoft Entertainment Pack.',
    'This product is licensed to: Remy Boy', 'Remys available to Remy OS: 4,490'],
  level: 'Level', score: 'Score', distance: 'Distance', countdown: 'Flow countdown', fast: '▶▶', fastLabel: 'Fast Flow', pause: 'Pause',
  resume: 'Resume', paused: 'Paused. The liquidity waits.', next: 'Next', dispenser: 'Dispenser — bottom piece is next',
  pocketDispenser: 'Dispenser — leftmost piece is next', vault: 'Vault', pool: 'Pool', bridge: 'C', portalLabels: ['A', 'B'],
  block: 'This block does not exist.', reservoir: 'Liquidity Pool', valve: 'Escrow valve', pass: 'Liquidity provided!',
  fail: 'Liquidity drained. Nobody drained anything.', bonus: 'BONUS ROUND: REORG THE PIPES', bonusEnd: 'Bonus round complete.',
  fiveCrosses: 'Five crossovers! +10,000', continue: 'Continue', newGame: 'New Game', passwordTitle: 'Enter Password',
  passwordPrompt: 'Type the 4-letter password:', invalidPassword: 'That password is not valid.', passwords: 'Earned passwords',
  passwordGiven: (word: string) => `Your password is: ${word}`, noPasswords: 'Complete a bonus round to earn a password.',
  ok: 'OK', cancel: 'Cancel', helpTitle: 'Pipe Dream Help', helpTabs: ['Rules', 'Scoring', 'Keyboard', 'Tips'],
  helpPages: [
    'Place the bottom dispenser piece on an empty cell before the countdown expires. Pieces cannot be rotated. Liquidity must enter an open pipe end. Crosses carry two independent straight paths. Unfilled placed pipes can be replaced; replacement locks placement for 250 milliseconds. Filled pipes and fixed features cannot be replaced. Meet the Distance requirement before the flow stops, or finish in the Pool drain. From Level 13, matching lettered edge portals wrap the flow across the board. After every fourth level, slide tiles adjacent to the empty cell; flow begins after 15 seconds.',
    'Each filled section scores 50 points. Fast Flow doubles section points. Sections beyond Distance also score double; both multipliers combine. Passing through a cross on its other axis awards 500 points. Five completed crossovers award 10,000 extra points. A reservoir takes three times as long and awards 200 extra points. Finishing in the drain awards 1,000 points and passes the level. Replacing a pipe costs 50 points. Each unused placed pipe costs 100 points at level end. Bonus rounds score 100 points per section without unused-pipe penalties. The ten highest scores are saved.',
    'Arrow keys move the yellow cell cursor. Space places or replaces a pipe, or slides a bonus-round tile. F enables Fast Flow for the rest of the level. F2 starts a new game. F3 pauses or resumes. F1 opens Help. Alt or F10 activates the menu bar. Click or press a key to skip a level-end celebration. Tap a cell to place a pipe; Pocket shows the next dispenser piece at the left. The game pauses when its window loses focus; select Resume to continue.',
    'Build a long road first. Liquidity is in no hurry, until it is. The dispenser runs from bottom to top. Route a loop through both axes of a cross for its bonus. A valve arrow shows the only permitted flow direction. Use reservoirs to gain time. Cabald bridge fragments are obstacles, whatever their tooltip claims. Passwords earned after bonus rounds start the following level with a score of zero.'
  ],
  scoresTitle: 'Pipe Dream High Scores', scoresHeading: 'Top Ten Pipe Layers', recordTitle: 'New High Score',
  recordMessage: 'Enter your name for the high-score table.', points: (value: number) => `${value.toLocaleString()} points`,
  rank: (rank: number, level: number) => `${rank}. Level ${level}`, levelAnnouncement: (level: number, distance: number) => `Level ${level} · Distance ${distance}`,
  scoreAnnouncement: (score: number, distance: number) => `Score ${score}. Distance remaining ${distance}.`,
  selectedCell: (column: number, row: number, piece: string) => `Column ${column}, row ${row}: ${piece}.`,
  pieceNames: {
    empty: 'Empty', horizontal: 'Horizontal', vertical: 'Vertical', ne: 'North-east elbow', se: 'South-east elbow', sw: 'South-west elbow',
    nw: 'North-west elbow', cross: 'Crossover', source: 'Vault', block: 'Unofficial bridge fragment', 'reservoir-h': 'Horizontal Liquidity Pool',
    'reservoir-v': 'Vertical Liquidity Pool', 'valve-n': 'Escrow valve, north', 'valve-e': 'Escrow valve, east', 'valve-s': 'Escrow valve, south',
    'valve-w': 'Escrow valve, west', drain: 'Pool drain'
  }
}
