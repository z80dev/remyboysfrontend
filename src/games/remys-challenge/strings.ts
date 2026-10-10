import type { Death, MonsterKind } from './types'

export const TITLE = "Remy's Challenge"
export const ONE_LINER = '40 levels. Collect the chips. Mind the Cabald.'

export const ABOUT = {
  version: '5.1 (Build 2600.remy_sp2.4490)',
  flavour: "Melinda would've wanted this.",
  lines: [
    'Remade for the Remy Boys community, 2026.',
    "After Chip's Challenge (1989/1992) by Chuck Sommerville.",
    'This product is licensed to: Remy Boy',
    'Remys available to Remy OS: 4,490'
  ]
}

export const MENU = {
  game: '&Game',
  newGame: '&New Game',
  restart: '&Restart Level',
  next: 'Ne&xt Level',
  previous: '&Previous Level',
  goTo: '&Go To...',
  pause: 'P&ause',
  bestTimes: '&Best Times...',
  exit: 'E&xit',
  options: '&Options',
  sound: '&Sound',
  music: '&Music',
  colorOff: '&Color Off',
  chooseRemy: 'Choose Your &Remy...',
  help: '&Help',
  contents: '&Contents',
  about: "&About Remy's Challenge..."
}

export const ACCEL = { newGame: 'F2', restart: 'Ctrl+R', next: 'Ctrl+N', previous: 'Ctrl+P', goTo: 'Ctrl+G', pause: 'F3', contents: 'F1' }

export const PANEL = {
  level: 'LEVEL',
  time: 'TIME',
  chipsLeft: 'CHIPS LEFT',
  untimed: '---',
  inventory: 'Inventory',
  thief: 'Nobody took your boots. You never had boots.',
  paused: 'PAUSED',
  pausedHint: 'Press any key or click to continue.'
}

export const DEATH: Record<Death, string> = {
  fire: "Ooops! Don't step in the fire without fire boots!",
  water: "Ooops! Remy can't swim without flippers!",
  monster: 'Ooops! Look out for monsters!',
  bomb: "Ooops! Don't touch the bombs!",
  time: 'Ooops! Out of time!'
}
export const DEATH_TITLE = 'Bummer'

export const MONSTER_NAMES: Record<MonsterKind, string> = {
  bug: 'Mempool Bug',
  paramecium: 'Gas Spike',
  fireball: 'Burn',
  glider: 'Airdrop',
  ball: 'Hopium Ball',
  tank: 'Escrow Tank',
  walker: 'FUD Walker',
  blob: 'Rug Blob',
  teeth: 'Cabald Grunt'
}

export const ITEM_NAMES = {
  chip: 'fREMY Chip',
  socket: 'Bridge Gate',
  blueKey: 'Blue Key',
  redKey: 'Red Key',
  greenKey: 'Green Key',
  yellowKey: 'Yellow Key',
  flippers: 'Flippers',
  fireBoots: 'Fire Boots',
  skates: 'Ice Skates',
  suction: 'Suction Boots'
}

export const levelCard = (n: number, title: string, password: string) => `Level ${n} \u2014 ${title} \u2014 Password: ${password}`

export const COMPLETE = {
  title: 'Level Complete',
  timeBonus: 'Time Bonus',
  levelBonus: 'Level Bonus',
  levelScore: 'Level Score',
  record: 'You have established a time record for this level!',
  total: 'Total Score',
  ok: 'OK',
  attempts: (n: number) => (n === 1 ? 'Finished on the first try. The Cabald denies noticing.' : `Finished after ${n} tries.`)
}

export const GOTO = {
  title: 'Go To Level',
  level: '&Level number:',
  password: '&Password:',
  ok: 'OK',
  cancel: 'Cancel',
  bad: 'That is not a valid password.',
  locked: 'That level is not unlocked yet.'
}

export const BEST = {
  title: 'Best Times',
  level: 'Level',
  time: 'Time',
  score: 'Score',
  none: 'No records yet.',
  reset: 'Reset Scores',
  total: 'Total Score'
}

export const ANNOUNCE = {
  levelStart: (n: number, title: string) => `Level ${n}, ${title}.`,
  chip: (left: number) => (left ? `Chip collected. ${left} left.` : 'All chips collected. The Bridge Gate is open.'),
  key: (name: string) => `Picked up ${name}.`,
  boots: (name: string) => `Picked up ${name}.`,
  thief: 'Your boots are gone.',
  win: (n: number, score: number) => `Level ${n} complete. Level score ${score}.`,
  timeLow: (s: number) => `${s} seconds left.`,
  paused: 'Game paused.',
  resumed: 'Game resumed.'
}

export const TOUCH = { up: 'Move up', right: 'Move right', down: 'Move down', left: 'Move left' }

/** Interstitials shown after levels 10, 20, 30 and 40. */
export const STORY: Record<10 | 20 | 30, { title: string; text: string }> = {
  10: {
    title: 'The Clubhouse',
    text: 'Beyond the meadow stands the Based Remy Boys Clubhouse. A note on the door reads: "Members only. Prove you can out-think the Cabald. \u2014 Prof. Gwei." Below it, in smaller print: "40 trials. No refunds."'
  },
  20: {
    title: 'Halfway Through',
    text: 'Prof. Gwei peers over his spectacles. "Twenty trials. Not bad. The Cabald has noticed you." Somewhere, a bald man in a cape insists he has not noticed anything, because he does not exist.'
  },
  30: {
    title: 'Rug Tower',
    text: 'The last trials climb Rug Tower. The capes inside all match, by coincidence. "We shaved for aerodynamics," says a sign. Prof. Gwei hands you a fREMY chip for luck. You were going to collect it anyway.'
  }
}

export const CERTIFICATE = {
  title: 'Certificate of Membership',
  heading: 'Based Remy Boys Clubhouse',
  body: 'Forty trials. Every chip. The Cabald, which does not exist, was out-thought anyway.',
  welcome: (name: string) => `Welcome to the club, ${name}.`,
  signed: 'Signed, Prof. Gwei',
  footer: 'There is no Cabald. I love you.',
  ok: 'OK'
}

export const HELP = {
  title: "Remy's Challenge Help",
  tabs: ['Rules', 'Scoring', 'Keyboard', 'Tips'] as const,
  sections: {
    Rules: [
      "The object of Remy's Challenge is to collect the required number of fREMY chips on each level, pass through the Bridge Gate, and reach the exit before time runs out.",
      'Keys open doors of the same color. Blue, red and yellow keys are used up; green keys are not. Boots protect you from water, fire, ice and force floors. Blocks can be pushed; a block pushed into water becomes dirt.',
      'Touching a monster, entering water or fire without the correct boots, stepping on a bomb, or running out of time ends the attempt, and the level restarts.',
      'Monsters do not exist. The Cabald has asked us to mention this.'
    ],
    Scoring: [
      'When you complete a level you receive a Time Bonus of 10 points for each second remaining, and a Level Bonus of 500 points times the level number.',
      'The Level Bonus is reduced by 20 percent for each retry, up to five retries. Your Total Score is the sum of your best score on each level.',
      'To view your records, choose Best Times from the Game menu.',
      'Points are not a currency. Please do not ask.'
    ],
    Keyboard: [
      'Arrow keys: Move Remy. Hold an arrow key to keep moving.',
      'F2: New game. Ctrl+R: Restart level. Ctrl+N: Next level. Ctrl+P: Previous level. Ctrl+G: Go to level. F3: Pause. F1: Help.',
      'Alt or F10: Activate the menu bar. Esc: Close a dialog.',
      'There is no key for denying things. The Cabald uses all of them.'
    ],
    Tips: [
      'Each level displays a password on its start card. Write it down; you can return to the level with Go To on the Game menu.',
      'Stand on a hint tile (?) to read advice for the level. Watch how each monster moves before crossing its path.',
      'Push blocks carefully. A block in the wrong place can make a level impossible; press Ctrl+R to start over.',
      'gm. Melinda would have read the hint tile.'
    ]
  }
}

export const MISC = {
  resetConfirm: 'Are you sure you want to reset the scores?',
  musicFor: (title: string) => `Now playing: ${title}`,
  ariaLabel: TITLE
}
