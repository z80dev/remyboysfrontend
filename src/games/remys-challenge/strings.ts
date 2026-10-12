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

/** Title, 4-letter password and hint-tile text for each of the 40 levels (index = level number - 1). */
export const LEVEL_TEXT: readonly { number: number; title: string; password: string; hint: string }[] = [
  { number: 1, title: 'LESSON 1: GM', password: 'REMY', hint: 'Collect every fREMY chip. When CHIPS LEFT reads 0, the Bridge Gate opens. Then walk into the exit.' },
  { number: 2, title: 'LESSON 2: KEYS TO THE VAULT', password: 'VALT', hint: 'Keys open doors of the same color. Blue, red and yellow keys are used up. One green key opens every green door.' },
  { number: 3, title: 'LESSON 3: HOPIUM BOOTS', password: 'HOPE', hint: 'Water drowns and fire burns. Flippers let you swim; Fire Boots let you walk through fire. Boots last all level.' },
  { number: 4, title: 'LESSON 4: BLOCK PARTY', password: 'PUSH', hint: 'Walk into a block to push it. A block pushed into water turns to dirt. Step on dirt and it becomes floor.' },
  { number: 5, title: 'LESSON 5: SLIPPERY FLOOR', password: 'SKAT', hint: 'Ice keeps you sliding until you reach something that is not ice. Curved corners turn you. Ice Skates let you walk.' },
  { number: 6, title: 'LESSON 6: FORCE OF HABIT', password: 'FORC', hint: 'Force floors carry you. While one carries you, you may step off it. Suction Boots let you walk on them.' },
  { number: 7, title: 'LESSON 7: BUG BOUNTY', password: 'BUGZ', hint: 'Mempool Bugs keep a wall on their left, so they circle forever. Walk in right behind one.' },
  { number: 8, title: 'LESSON 8: BUTTONS', password: 'KLIK', hint: 'Brown opens traps. Red runs clone machines. Green flips toggle walls. Blue turns Escrow Tanks around.' },
  { number: 9, title: 'MEMPOOL MEADOW', password: 'MEMP', hint: 'Bugs and Gas Spikes cannot cross gravel. Wait on the path until the field is clear.' },
  { number: 10, title: 'GENESIS TOWN', password: 'GNSS', hint: 'Pop-up walls rise behind you. Read the door colors before you go in anywhere.' },
  { number: 11, title: 'HOPIUM DEN', password: 'HOPI', hint: 'Hopium Balls bounce between walls forever. Count the beat, then cross.' },
  { number: 12, title: 'LIQUIDITY CITY', password: 'LQDT', hint: 'Airdrops swim and turn left at walls. Blocks make bridges. Flippers come later.' },
  { number: 13, title: 'BURN ADDRESS', password: 'BURN', hint: 'Burns ride the fire and turn right. A block pushed onto a bomb takes the bomb with it.' },
  { number: 14, title: 'THE EXCHANGE', password: 'SWAP', hint: 'A teleport sends you to the one before it in reading order. Every booth makes a different trade.' },
  { number: 15, title: 'COLD STORAGE', password: 'COLD', hint: 'No skates in cold storage. Plan each slide before you start it.' },
  { number: 16, title: 'BRIDGE TERMINAL', password: 'GATE', hint: 'Thin walls block one edge only. The departures belt lets you off at open gates, and only ever eastbound.' },
  { number: 17, title: 'NOT YOUR KEYS', password: 'NOBO', hint: 'ABSOLUTELY NOBODY takes your boots, never your keys. Cross his bridge when you have nothing left to lose.' },
  { number: 18, title: 'PROOF OF WORK', password: 'POWK', hint: 'A block can hold a button down for you. There is exactly one spare block.' },
  { number: 19, title: 'GAS STATION', password: 'GWEI', hint: 'Every red button pumps out another Gas Spike. Only fill up what you need.' },
  { number: 20, title: 'RUG PULL CANYON', password: 'RUGP', hint: 'Mixed force floors push you every which way. FUD Walkers wander. Keep to the gravel ledges.' },
  { number: 21, title: 'THE FLOOR', password: 'MUSE', hint: 'Not every wall in the museum is a wall. Touch the exhibits. Gently.' },
  { number: 22, title: "ESCROW'S OFFICE", password: 'ESCR', hint: 'Escrow Tanks only roll forward. Every blue button turns every tank around.' },
  { number: 23, title: 'SHORT & SQUEEZE', password: 'SQZE', hint: 'Grunts close the longer gap first. Gravel stops them cold. They have never heard of gravel.' },
  { number: 24, title: 'LEDGER MAZE', password: 'LDGR', hint: 'Each green button rewrites the ledger. Recessed walls close behind you.' },
  { number: 25, title: 'AIRDROP SEASON', password: 'DROP', hint: 'Each red button launches an Airdrop down the canal. Launch on purpose, then swim behind it.' },
  { number: 26, title: 'REORG', password: 'RORG', hint: 'Every green button reorders the chain. Some gates only open one way.' },
  { number: 27, title: 'MEV SANDWICH', password: 'MEVS', hint: 'Stand on the gravel and a Grunt walks into the trap for you. The way out lets them go. Do not be the filling.' },
  { number: 28, title: 'SEED PHRASE', password: 'SEED', hint: 'Write it down: E E E S S W W S S E E E. Never type it anywhere else.' },
  { number: 29, title: 'PLAUSIBLE DENIABILITY', password: 'DENY', hint: 'Some blue walls are real. Some are not. The Cabald declines to comment.' },
  { number: 30, title: 'MATCHING CAPES', password: 'CAPE', hint: 'The capes match by coincidence, and so do the rooms. Lure one Grunt at a time.' },
  { number: 31, title: 'WE SHAVED FOR AERODYNAMICS', password: 'AERO', hint: 'Rug Tower, floor 1. Skates and suction save seconds. You will need the seconds.' },
  { number: 32, title: 'COLD WALLET', password: 'WALT', hint: 'Blocks slide on ice too. Corners turn them just like you.' },
  { number: 33, title: 'SLIPPAGE', password: 'SLIP', hint: 'Random force floors choose a direction when you step on them. Nobody is waiting halfway across.' },
  { number: 34, title: 'DIAMOND HANDS', password: 'HODL', hint: 'Push a block onto a bomb and both are gone. Do not hold the bomb yourself.' },
  { number: 35, title: 'FRONT RUN', password: 'FRNT', hint: 'The clone machines are front-running you. Take the chips before the tanks arrive.' },
  { number: 36, title: 'RUGGED', password: 'RUGD', hint: 'Rug Blobs crawl at random and at half speed. Gravel keeps them off your path.' },
  { number: 37, title: 'HALVING', password: 'HALV', hint: 'Two halves, one gate. Half of the chips will do. Pick the half you can finish.' },
  { number: 38, title: 'FORK IN THE ROAD', password: 'FORK', hint: 'One yellow key, two yellow doors. Look down both roads before you choose.' },
  { number: 39, title: 'ABSOLUTELY NOBODY', password: 'NOPE', hint: 'Nobody lives on this floor. Nobody is standing in three places.' },
  { number: 40, title: 'THERE IS NO CABALD', password: 'LOVE', hint: 'The top of Rug Tower. Everything you learned, all at once. The Rug Lord is not home.' }
]

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
  headings: { label: 'Level', score: 'Score', name: 'Time' },
  elapsed: (seconds: number | null) => seconds === null ? '\u2014' : `${seconds}s`,
  total: 'Total'
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
export const STORY: Record<10 | 20 | 30 | 40, { title: string; text: string }> = {
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
  },
  40: {
    title: 'The Roof',
    text: 'The throne on the roof of Rug Tower is empty. Three capes hang on a coat rack, folded the same way, by coincidence. Prof. Gwei is waiting by the stairs with a clipboard. "Forty trials," he says. "The Clubhouse has a dress code. You meet it."'
  }
}

export const CERTIFICATE = {
  title: 'Certificate of Membership',
  heading: 'Based Remy Boys Clubhouse',
  body: 'Forty trials. Every chip. The Cabald, which does not exist, was out-thought anyway.',
  signBook: 'Sign the Clubhouse membership book:',
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
      'Melinda would have read the hint tile.'
    ]
  }
}

export const MISC = {
  resetConfirm: 'Are you sure you want to reset the scores?',
  musicFor: (title: string) => `Now playing: ${title}`,
  ariaLabel: TITLE
}
