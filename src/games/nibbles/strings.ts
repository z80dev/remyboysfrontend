import { formatScore, type Game } from './engine'

export const strings = {
  title: 'Remy Nibbles',
  short: 'Nibbles',
  description: 'QBasic classic: eat the numbers, don\'t bite yourself',
  scoreLabel: 'Scores and lives',
  startup: 'C:\\REMYOS>QBASIC /RUN NIBBLES.BAS',
  introTitle: 'R E M Y   N i b b l e s',
  introDescription: 'A game for one or two players. Steer your snake around the board and eat the numbers in order. ' +
    'Every number makes you longer and earns points. Walls, the other snake and your own tail are fatal.',
  introLines: [
    'A game for one or two players. Steer your snake around the board',
    'and eat the numbers in order. Every number makes you longer',
    'and earns points. Walls, the other snake and your own tail',
    'are fatal.',
  ],
  continue: 'Press any key to continue',
  continueTouch: 'Press any key or tap to continue',
  player1: 'Player 1 (Remy) ↑ ↓ ← →',
  player2: 'Player 2 (Jake) W S A D',
  pauseControl: 'P - Pause',
  playerNames: ['Remy', 'Jake'],
  prompts: [
    'How many players (1 or 2)?',
    'Skill level (1 to 100)?',
    'Increase game speed during play (Y or N)?',
    'Monochrome or color monitor (M or C)?',
  ],
  skillLines: ['1   = Novice', '90  = Expert', '100 = Twiddle Fingers', '(Computer speed may affect your skill level)'],
  defaults: ['1', '50', 'Y', 'C'],
  invalid: ['Enter 1 or 2.', 'Enter a skill level from 1 to 100.', 'Enter Y or N.', 'Enter M or C.'],
  remyDies: 'Remy Dies! Push Space! --->',
  jakeDies: '<---- Jake Dies! Push Space',
  paused: ' Game Paused ... Push Space ',
  remyDiesTouch: 'Remy Dies! Push Space or tap! --->',
  jakeDiesTouch: '<---- Jake Dies! Push Space or tap',
  pausedTouch: ' Game Paused ... Push Space or tap ',
  gameOver: 'G A M E   O V E R',
  again: 'Play Again?   (Y/N)',
  cabald: 'There is no Cabald. I love you.',
  pauseButton: 'Pause',
  continueButton: 'Continue',
  yes: 'Y',
  no: 'N',
  enter: 'Enter',
  setupLabel: 'Setup answer',
  jakeTouch: 'Left half: Jake',
  remyTouch: 'Right half: Remy',
  swipeTouch: 'Swipe to steer Remy',
  game: '&Game',
  new: '&New Game',
  newKey: 'F2',
  helpKey: 'F1',
  pauseKey: 'P',
  pause: '&Pause',
  sound: '&Sound',
  exit: 'E&xit',
  options: '&Options',
  choose: 'Choose Your &Remy…',
  help: '&Help',
  contents: '&Contents',
  about: '&About Remy Nibbles…',
  helpTitle: 'Remy Nibbles Help',
  helpTabs: ['Rules', 'Scoring', 'Keyboard', 'Tips'],
  helpSections: [
    'Guide your snake to the numbers, 1 through 9, in order. Each number makes the snake longer. After 9, you advance to the next level. ' +
      'Running into a wall, a snake or your own tail costs a life. Long Remy is long.',
    'Eating number n scores n × 100 points. Losing a life subtracts 1,000 points. Each player starts with 5 lives.',
    'REMY: Arrow keys. JAKE: W, S, A, D. P: Pause. SPACEBAR: Continue. F2: New Game. F1: Help. On touch screens, swipe to steer. ' +
      'In a two-player game, the left half steers Jake and the right half steers Remy. Blank Enter deliberately uses setup defaults: 1, 50, Y, C.',
    'Plan your path before you eat. The snake grows over the next few moves, not all at once. Lower skill levels are slower. ' +
      'Eat slowly. Long Remy is long, but the wall is longer.',
  ],
  version: '5.1 (Build 2600.remy_sp2.4490)',
  flavour: 'Long Remy is long.',
  aboutLines: [
    'Remade for the Remy Boys community, 2026.',
    'After NIBBLES.BAS (1990) by Microsoft (the QBasic sample program).',
    'This product is licensed to: Remy Boy',
    'Remys available to Remy OS: 4,490',
  ],
  pausedAnnouncement: 'Game paused. Press Space to continue.',
  resumedAnnouncement: 'Game resumed.',
  overAnnouncement: 'Game over. Press Y to play again or N to return to the introduction.',
  introAnnouncement: 'Remy Nibbles. Press any key to continue.',
}

export function levelMessage(level: number, touch = false): string {
  return touch ? `Level ${level}, Push Space or tap` : `Level ${level}, Push Space`
}

export function scoreLine(game: Game, player: number): string {
  const snake = game.snakes[player]
  return player === 0 ? `REMY-->  Lives: ${snake.lives}     ${formatScore(snake.score)}`
    : `${formatScore(snake.score)}  Lives: ${snake.lives}  <--JAKE`
}

export function eatAnnouncement(game: Game): string {
  return `${strings.playerNames[game.eater]} ate ${game.eaten}. Score: ${formatScore(game.snakes[game.eater].score)}.`
}

export function deathAnnouncement(game: Game): string {
  let text = ''
  for (let player = 0; player < game.snakes.length; player++) {
    if (!(game.deaths & (1 << player))) continue
    const snake = game.snakes[player]
    text += `${strings.playerNames[player]} lost a life. Lives: ${snake.lives}. Score: ${formatScore(snake.score)}. `
  }
  return text + (game.phase === 'over' ? strings.overAnnouncement : levelMessage(game.level))
}
