const clearFlavour = 'The cats were never here.'
const levelBonus = (bonus: number, speed: string, multiplier: number) => `Level bonus: ${bonus.toLocaleString()} (${speed} ×${multiplier})`
export const S = {
  title: 'Remy\'s Revenge',
  intro: 'Trap the Cabald\'s cats. Eat the cheese.',
  flavour: 'Remy was a rodent all along.',
  game: '&Game', options: '&Options', help: '&Help', new: '&New', pause: '&Pause', best: '&Best Scores…', exit: 'E&xit',
  level: '&Level…', speed: '&Speed', speeds: ['Snail', 'Slow', 'Medium', 'Fast', 'Cheetah'], sound: '&Sound', choose: 'Choose Your &Remy…',
  contents: '&Contents', about: '&About Remy\'s Revenge…', helpTitle: 'Remy\'s Revenge Help',
  levelTitle: 'Select Level', levelLabel: 'Starting level (1–50):',
  ok: 'OK', cancel: 'Cancel', overall: 'Best Overall', recent: 'Best in the Last 24 Hours', scores: 'Best Scores',
  tabs: ['Rules', 'Scoring', 'Keyboard', 'Tips'],
  helpText: [
    'Move the mouse in eight directions. Push complete lines of movable blocks into an empty cell. Trap all cats to turn them into cheese. '
      + 'Blue clock marks release new waves. Trap the final wave to finish the level. Rugs hold you for five seconds; traps and Hopium yarn cost a life. '
      + 'You begin with three lives. After a death, occupied start cells use the nearest empty respawn space.',
    'Each cheese is worth 100 points × the speed multiplier at the start of the level. Completing a level earns '
      + '(whole seconds remaining × 10 + 1,000) × the same multiplier. Speed changes take effect at the next level or new game. '
      + 'Snail through Cheetah multiply all points by one through five. The two score tables retain ten entries each.',
    'Arrow keys move horizontally and vertically. Home, Page Up, End, Page Down, or Q, E, Z, C move diagonally. Numpad 1–9 also moves. '
      + 'F2 starts a new game. F3 pauses. F1 opens Help. Swipe once to move one cell; '
      + 'keep a drag still for 375 milliseconds to repeat every 150 milliseconds. Releasing a direction restores the last movement key still held.',
    'Build walls around cats, leaving yourself an escape route. Fixed blocks and hazards stop a push. Cats can move diagonally and cross cheese. '
      + 'Watch the blue marks before leaving the center. The cats deny everything.',
  ],
  aboutLines: [
    'Remade for the Remy Boys community, 2026.',
    'After Rodent\'s Revenge (1991) by Christopher Lee Fraley.',
    'This product is licensed to: Remy Boy',
    'Remys available to Remy OS: 4,490',
  ],
  version: '5.1 (Build 2600.remy_sp2.4490)',
  rugged: 'You got rugged.',
  trapped: 'The cats are now cheese. By coincidence.',
  deaths: { cat: 'Caught. The cat denies it.', trap: 'Snap. Plausible deniability.', yarn: 'Too much Hopium.' },
  gameOver: 'Game over.', denial: 'There is no Cabald. I love you.', clear: 'Level complete.',
  clearFlavour, levelBonus,
  clearMessage: (bonus: number, speed: string, multiplier: number) => `Level complete. ${levelBonus(bonus, speed, multiplier)}. ${clearFlavour}`,
  speedPending: (speed: string) => `${speed} takes effect next level or new game.`,
  continueHint: 'Click or press any key to continue.', resumeHint: 'Click or press any key to resume.', overHint: 'Click or press F2 to play again.',
  jingle: 'Level Clear', paused: 'Paused', scoreName: 'Enter Your Name',
  scoreMessage: 'You have one of the ten best scores. Please type your name.',
  board: '23 by 23 board. Move and push in eight directions.',
  direction: ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'],
  levelStart: (level: number) => `Level ${level}. The cats deny everything.`,
  status: (level: number, lives: number, score: number) => `Level ${level}. ${lives} ${lives === 1 ? 'life' : 'lives'}. Score ${score}.`,
  rank: (rank: number) => String(rank),
}
