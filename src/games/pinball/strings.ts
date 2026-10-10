// Every user-facing string for 3D Pinball for Remy OS - Base Cadet.

export type MissionId =
  | 'launch'
  | 'bridge'
  | 'gas'
  | 'mint'
  | 'bug'
  | 'recovery'
  | 'menace'
  | 'secret'
  | 'airdrop'
  | 'spike'
  | 'rug'
  | 'plague'
  | 'ledger'
  | 'recon'
  | 'tower'
  | 'reorg'
  | 'cabald'

export type ControlAction = 'left' | 'right' | 'plunger' | 'nudgeLeft' | 'nudgeRight' | 'nudgeUp'

const HELP_RULES = [
  'Welcome to the Base Federation, Cadet. Your task is to rise from Cadet to Fleet Admiral by completing missions.',
  'Press and hold Space to pull the plunger, then release it to launch the ball. The longer you hold, the harder the launch.',
  'To start a mission, hit the three mission targets on the left wall to choose one, then shoot the launch ramp to accept it. The panel shows the mission name, its goal and how much remains.',
  'Each completed mission counts toward promotion: two at Cadet, then three for each rank after that. There are nine ranks.',
  'The fuel lights drain while you play. When the tank is empty the launch ramp will not accept missions. Shoot the fuel chute on the right to refuel.',
  'Shoot the hyperspace chute three times quickly to raise the centre post. A fourth quick shot lights Extra Ball.',
  'Light all three hazard targets on a side to close that out-lane gate once.',
  'If a ball drains within 10 seconds of launch, it is saved once and launched again.',
  'Nudging is allowed. Nudging too often in a short time causes a TILT: the ball is lost and its bonus is forfeited.',
  'You have three balls. Up to four players may take turns.',
  'The Cabald does not appear on this table. Any bald heads printed on the bumpers are a coincidence.'
].join('\n\n')

const HELP_SCORING = [
  'Attack bumpers: 500 points times the bumper level (1 to 4).',
  'Spot targets: 1,000 points. Drop targets: 2,500 points, plus 25,000 for clearing the bank.',
  'Ramps: 5,000 points. Wormholes: 10,000 points. Matching the lit wormhole colour awards a replay.',
  'Mission completed: 50,000 points times your rank. Promotion: 100,000 points.',
  'Clearing the booster drop bank raises the field multiplier, up to ×5.',
  'End-of-ball bonus: lanes and missions counted, times the field multiplier and your rank. The tally is shown when the ball drains.',
  'Scores past 999,999,999 go round the clock. The Federation still counts it.'
].join('\n\n')

const HELP_KEYBOARD = [
  'Z\tLeft flipper',
  '/\tRight flipper',
  'Space\tPlunger (hold, then release)',
  'X\tNudge left',
  '.\tNudge right',
  'Up Arrow\tNudge up',
  'F2\tNew game',
  'F3\tPause or resume',
  'F4\tFull screen',
  'F8\tPlayer controls',
  'F1\tHelp',
  '',
  'Use Player Controls (F8) to change the flipper, plunger and nudge keys. Your choices are saved.',
  'On a touch screen, touch the left or right half of the table to flip. Hold PLUNGER, or swipe up from the lower right corner, to launch.'
].join('\n')

const HELP_TIPS = [
  'Hold a flipper up to cradle the ball, then aim your shot calmly.',
  'Use the flippers to move the lit re-entry lanes before the ball comes down.',
  'Refuel before Gas Low turns into an empty tank.',
  'A small nudge saves more balls than a large one.',
  'Choose missions you can reach from the flippers you trust.',
  'gm, Cadet. Ship it.'
].join('\n\n')

export const STRINGS = {
  title: '3D Pinball for Remy OS - Base Cadet',
  short: 'Pinball',
  start: 'Rise from Cadet to Fleet Admiral on Base',
  aboutTitle: '3D Pinball',
  aboutFlavour: 'Awaiting deployment (on Base).',
  aboutCredit: 'After 3D Pinball for Windows – Space Cadet (1995) by Cinematronics / Maxis.',
  aboutLines: [
    'Remade for the Remy Boys community, 2026.',
    'After 3D Pinball for Windows – Space Cadet (1995) by Cinematronics / Maxis.',
    'This product is licensed to: Remy Boy',
    'Remys available to Remy OS: 4,490'
  ],
  helpTitle: '3D Pinball Help',
  helpTabs: ['Rules', 'Scoring', 'Keyboard', 'Tips'],
  helpTexts: [HELP_RULES, HELP_SCORING, HELP_KEYBOARD, HELP_TIPS],
  helpRules: HELP_RULES,
  helpScoring: HELP_SCORING,
  helpKeyboard: HELP_KEYBOARD,
  helpTips: HELP_TIPS,

  game: '&Game',
  options: '&Options',
  help: '&Help',
  newGame: '&New Game',
  launch: '&Launch Ball',
  pause: '&Pause/Resume Game',
  highScores: '&High Scores...',
  demo: '&Demo',
  exit: 'E&xit',
  fullScreen: '&Full Screen',
  players: 'Select &Players',
  playerItem: ['&1 Player', '&2 Players', '&3 Players', '&4 Players'],
  controls: 'Player &Controls...',
  sound: '&Sound',
  music: '&Music',
  chooseRemy: 'Choose Your &Remy...',
  contents: '&Contents',
  about: '&About 3D Pinball...',

  paused: 'Paused',
  resume: 'Press F3 or click to resume',
  testMode: 'Test Mode',
  demoMode: 'Demo. Press any key.',
  gameOver: 'Game Over',
  highScoresTitle: 'High Scores',
  highScoresHeading: 'Fleet Records',
  rankHeader: 'Rank',
  nameHeader: 'Name',
  scoreHeader: 'Score',
  nameEntryTitle: 'High Score',
  nameEntryMessage: 'You have a high score. Please enter your name.',
  reset: '&Reset',
  resetConfirm: 'Are you sure you want to reset the scores?',
  cancel: 'Cancel',
  ok: 'OK',
  defaults: '&Default',
  controlsTitle: '3D Pinball: Player Controls',
  controlsIntro: 'To change a game control, click the control box, then press the new key.',
  keyPrompt: 'Press a key...',
  duplicateKey: 'That key is already in use. Choose another.',
  controlLabels: {
    left: 'Left Flipper',
    right: 'Right Flipper',
    plunger: 'Plunger',
    nudgeLeft: 'Left Table Bump',
    nudgeRight: 'Right Table Bump',
    nudgeUp: 'Bottom Table Bump'
  } as Record<ControlAction, string>,
  spaceLabel: 'Space',
  keyNames: { ' ': 'Space', ArrowUp: 'Up Arrow', ArrowDown: 'Down Arrow', ArrowLeft: 'Left Arrow', ArrowRight: 'Right Arrow' } as Record<string, string>,
  touchPlunger: 'PLUNGER',
  touchNudgeLeft: 'Nudge left',
  touchNudgeRight: 'Nudge right',
  touchNudgeUp: 'Nudge up',
  ariaTable: '3D Pinball table',
  plungerDecal: 'GAS: LOW. VIBES: HIGH.'
} as const

export const S = STRINGS

// Printed playfield inserts (pre-rendered into the table art).
export const TABLE_LABELS = {
  reentry: 'RE-ENTRY',
  bonus: 'BONUS',
  mission: 'MISSION',
  hyperspace: 'HYPERSPACE',
  extraBall: 'EXTRA BALL',
  hazard: 'HAZARD',
  launchRamp: 'LAUNCH',
  attack: 'ATTACK',
  engine: 'ENGINE',
  satellite: 'SATELLITE',
  fuel: 'FUEL',
  flags: 'FLAGS',
  blackHole: 'BLACK HOLE',
  wormhole: 'WORMHOLE',
  booster: 'BOOSTER',
  spaceWarp: 'SPACE WARP',
  rank: 'RANK',
  shootAgain: 'SHOOT AGAIN',
  multipliers: ['x1', 'x2', 'x3', 'x4', 'x5'],
  apron: 'BASE CADET',
  apronSub: 'BASE FEDERATION FLEET',
  tilt: 'TILT',
  cabaldRing: 'C'
} as const

export const PANEL_COPY = {
  title: 'BASE CADET',
  federation: 'BASE FEDERATION',
  pilot: 'PILOT',
  score: 'Score',
  player: 'Player',
  ball: 'Ball',
  rank: 'Rank',
  fuel: 'Gas',
  multiplier: 'Bonus',
  paused: 'Paused',
  testMode: 'Test Mode'
} as const

export const RANKS: readonly string[] = [
  'Cadet',
  'Ensign',
  'Lieutenant',
  'Captain',
  'Lieutenant Commander',
  'Commander',
  'Commodore',
  'Admiral',
  'Fleet Admiral'
]

export const MISSION_NAMES: Record<MissionId, string> = {
  launch: 'Launch Training',
  bridge: 'Bridge Training',
  gas: 'Gas Practice',
  mint: 'Mint Mission',
  bug: 'Bug Bounty',
  recovery: 'Recovery Mission',
  menace: 'Cabald Menace',
  secret: 'There Is No Mission',
  airdrop: 'Stray Airdrop',
  spike: 'Gas Spike',
  rug: 'Rug Pull',
  plague: 'FUD Plague',
  ledger: 'Ledger Retrieval',
  recon: 'Mempool Recon',
  tower: 'Rug Tower',
  reorg: 'Reorg',
  cabald: 'THE CABALD'
}

const times = (n: number) => (n === 1 ? '1 more time' : `${n} more times`)
const WORMHOLES = ['Yellow', 'Red', 'Green']
const CABALD_STAGES = [
  (n: number) => `Hit ${n} more Drop Targets`,
  (n: number) => `Hit ${n} more Spot Targets`,
  (n: number) => `Pass ${n} more Lanes`,
  () => 'Shoot the Fuel Chute',
  () => 'Shoot the Launch Ramp',
  () => 'Spin the Flags',
  () => 'Enter any Wormhole',
  () => 'Enter the Hyperspace Kicker'
]

// Goal line for the panel. stage counts from 0; remaining is what is left in the current stage.
export function missionGoal(id: MissionId | string, stage: number, remaining: number): string {
  switch (id) {
    case 'launch':
      return `Shoot the Launch Ramp ${times(remaining)}`
    case 'bridge':
      return `Pass the Re-entry Lanes ${times(remaining)}`
    case 'gas':
      return `Hit Attack Bumpers ${times(remaining)}`
    case 'mint':
      return `Hit ${remaining} more Drop Targets`
    case 'bug':
      return `Hit ${remaining} more Targets`
    case 'recovery':
      return stage === 0 ? 'Upgrade the Flags: spin them' : 'Enter the Hyperspace Kicker'
    case 'menace':
      return stage === 0 ? 'Upgrade the Attack Bumpers' : `Hit Attack Bumpers ${times(remaining)}`
    case 'secret':
      return `Enter the ${WORMHOLES[Math.min(2, Math.max(0, stage))]} Wormhole`
    case 'airdrop':
      return stage === 0 ? `Light ${remaining} more Right Hazard Lights` : 'Enter the Hyperspace Kicker'
    case 'spike':
      return stage === 0 ? `Light ${remaining} more Left Hazard Lights` : 'Enter any Wormhole'
    case 'rug':
      return stage === 0 ? 'Upgrade the Engines' : 'Enter the Black Hole'
    case 'plague':
      return stage === 0 ? `Spin the Flags ${times(remaining)}` : 'Roll over the Space Warp'
    case 'ledger':
      return `Hit the Satellite ${times(remaining)}`
    case 'recon':
      return `Pass ${remaining} more Lanes`
    case 'tower':
      return `Drain an Out-lane ${times(remaining)}`
    case 'reorg':
      return stage === 0 ? `Hit the Rebounds ${times(remaining)}` : 'Ramp to promote. Hyperspace to demote.'
    case 'cabald':
      return (CABALD_STAGES[stage] ?? CABALD_STAGES[0])(remaining)
    default:
      return ''
  }
}

export type MessageId =
  | 'awaiting'
  | 'launched'
  | 'selected'
  | 'accepted'
  | 'completed'
  | 'promotion'
  | 'reorg'
  | 'recoveryCompleted'
  | 'cabaldCompleted'
  | 'lowFuel'
  | 'noFuel'
  | 'refuel'
  | 'saved'
  | 'extraBall'
  | 'extraBallLit'
  | 'replay'
  | 'tilt'
  | 'player'
  | 'gameOver'
  | 'bonus'
  | 'clock'
  | 'postRaised'
  | 'testMode'
  | 'bumperUpgrade'
  | 'engineUpgrade'
  | 'flagUpgrade'
  | 'multiplier'
  | 'anonymous'

// Dot-matrix messages. detail: mission name (selected/accepted), rank name (promotion/reorg), replay count,
// 1-based player number, formatted bonus amount, bumper level or multiplier.
export function ruleMessage(id: MessageId, detail?: string | number): string {
  switch (id) {
    case 'awaiting':
      return 'Awaiting Deployment'
    case 'launched':
      return 'Deployed. Good hunting, Cadet.'
    case 'selected':
      return `Mission Selected: ${detail}`
    case 'accepted':
      return `Mission Accepted: ${detail}`
    case 'completed':
      return 'Mission Completed'
    case 'promotion':
      return `Promotion to ${detail}`
    case 'reorg':
      return `Chain reorganised. You are now ${detail}. Or were you always?`
    case 'recoveryCompleted':
      return 'Stolen Remys returned. Reclaim honoured.'
    case 'cabaldCompleted':
      return 'There is no Cabald. I love you.'
    case 'lowFuel':
      return 'Gas Low'
    case 'noFuel':
      return 'Out of Gas. Refuel at the Fuel Chute'
    case 'refuel':
      return 'Refueled'
    case 'saved':
      return 'Ball Saved'
    case 'extraBall':
      return 'Extra Ball'
    case 'extraBallLit':
      return 'Extra Ball Lit'
    case 'replay':
      return detail === undefined || detail === 1 ? 'Replay Awarded' : `Replay Awarded (${detail})`
    case 'tilt':
      return 'Tilt!'
    case 'player':
      return `Player ${detail}`
    case 'gameOver':
      return 'Game Over'
    case 'bonus':
      return `Bonus ${detail}`
    case 'clock':
      return 'You have gone round the clock'
    case 'postRaised':
      return 'Centre Post Raised'
    case 'testMode':
      return 'Test Mode'
    case 'bumperUpgrade':
      return detail === undefined ? 'Attack Bumpers Upgraded' : `Attack Bumpers Level ${detail}`
    case 'engineUpgrade':
      return 'Engines Upgraded. We shaved for aerodynamics.'
    case 'flagUpgrade':
      return 'Flags Upgraded'
    case 'multiplier':
      return `Field Multiplier x${detail}`
    case 'anonymous':
      return 'Anonymous'
  }
}
