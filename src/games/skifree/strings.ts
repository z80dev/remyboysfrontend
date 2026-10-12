import type { Course } from './types'

const styleAnnouncement = (score: number) => `Style: ${score.toLocaleString('en-US')} points.`

/** Every SkiFree string, reviewed in one place: menus, dialogs, help, signs, balloons and announcements. */
export const STRINGS = {
  title: 'SkiFree',
  startLine: 'Ski Mempool Mountain. Mind the bald guy.',
  flavour: 'Press F. Pay respects later.',
  version: '5.1 (Build 2600.remy_sp2.4490)',
  helpTitle: 'SkiFree Help',
  aboutLines: [
    'Remade for the Remy Boys community, 2026.',
    'After SkiFree (1991) by Chris Pirih.',
    'This product is licensed to: Remy Boy',
    'Remys available to Remy OS: 4,490',
  ],
  help: [
    {
      title: 'Rules',
      text: 'Ski down Mempool Mountain for as long as you like. Steer around trees, stumps, rocks, dogs and other skiers; hitting one knocks you down for a moment.\n'
        + 'From the starting area, take the Slalom, Tree Slalom or Freestyle course, or ski the open slope. On a slalom course, pass to the left of blue flags and to the right of red flags.\n'
        + 'After 2,000 meters, at the end of a course, or if you wander too far from the start, the Abominable Cabald appears. He does not exist. He will also eat you.',
    },
    {
      title: 'Scoring',
      text: 'The status box shows elapsed time, your deepest downhill distance in meters, speed in meters per second, and style points.\n'
        + 'Slalom and Tree Slalom are scored by time. Each missed gate adds 5 seconds.\n'
        + 'Freestyle is scored by style. Jumps and tricks landed cleanly add points; crashing takes them away.\n'
        + 'The distance record is your deepest descent. After a course finishes, its clock stops and you may keep skiing.\n'
        + 'Records are kept on this computer. Not on chain. Nowhere near a chain.',
    },
    {
      title: 'Keyboard',
      text: 'Left or Right Arrow (NumPad 4 or 6): turn one step toward that side.\n'
        + 'Down Arrow (NumPad 2): point straight downhill.\n'
        + 'Up Arrow (NumPad 8): slow down. When stopped, walk uphill.\n'
        + 'NumPad 1 or 3: turn diagonally left or right. NumPad 7 or 9: stop facing left or right.\n'
        + 'Insert (NumPad 0): jump. In the air, Left or Right spins, Up flips forward and Down flips backward.\n'
        + 'F: go fast. F2: new game. F3: pause. T while paused: advance one frame.\n'
        + 'Mouse or touch: the skier points toward the pointer. Click or tap to jump.',
    },
    {
      title: 'Tips',
      text: 'When stopped, press toward the side you are facing to step sideways.\n'
        + 'Ramps launch you. The rainbow ramp launches you considerably more. Moguls bounce.\n'
        + 'Finish a trick before you land, or land on your face.\n'
        + 'Dogs are friendly. Do not eat the yellow snow.\n'
        + 'If you hear growling, press F. It is the only known treatment.\n'
        + '"We shaved for aerodynamics." The Cabald, who does not exist.',
    },
  ] as { title: 'Rules' | 'Scoring' | 'Keyboard' | 'Tips'; text: string }[],
  signs: {
    mountain: 'MEMPOOL MOUNTAIN',
    slalom: '\u25c4 SLALOM',
    tree: 'TREE SLALOM \u25bc',
    freestyle: 'FREESTYLE \u25ba',
    numpad: 'Use the NumPad (0-9) for better control.',
    nothing: '2000m \u2014 NOTHING TO SEE HERE',
  },
  banners: { start: 'START', finish: 'FINISH' },
  monster: {
    arrival: 'There is no Cabald. I love you.',
    burp: '*burp* Plausible deniability.',
  },
  status: { time: 'Time:', dist: 'Dist:', speed: 'Speed:', style: 'Style:', meters: 'm', speedUnit: 'm/s' },
  gameOver: 'You were eaten by something that does not exist. Press F2 to ski again.',
  courseNames: { free: 'Free Ski', slalom: 'Slalom', tree: 'Tree Slalom', freestyle: 'Freestyle' } as Record<Course, string>,
  scoreNames: { slalom: 'Slalom', tree: 'Tree Slalom', freestyle: 'Freestyle', distance: 'Distance' },
  ui: {
    gameMenu: '&Game',
    newGameKey: 'F2',
    pauseKey: 'F3',
    helpKey: 'F1',
    gameOverTitle: 'Game Over',
    optionsMenu: '&Options',
    helpMenu: '&Help',
    newGame: '&New Game',
    pause: '&Pause',
    bestScores: '&Best Scores\u2026',
    exit: 'E&xit',
    sound: '&Sound',
    chooseRemy: '&Choose Your Remy\u2026',
    snowboarder: 'Snow&boarder',
    contents: '&Contents',
    about: '&About SkiFree\u2026',
    resume: 'Resume',
    pausedHint: 'Click or press any key to resume.',
    touchPausedHint: 'Tap Resume to continue.',
    frameStep: 'Press T to advance one frame.',
    fast: 'F',
    jump: 'Jump',
    nameTitle: 'Best Score',
    nameMessage: 'You set a SkiFree record. Please enter your name.',
    bestTitle: 'Best Scores',
    bestHeading: 'SkiFree records',
    ok: 'OK',
    distanceUnit: 'm',
    styleUnit: 'points',
    helpTabsAria: 'Help topics',
    slopeAria: 'SkiFree slope',
    controlsAria: 'Touch controls',
    pauseButton: 'Pause',
    fastButton: 'Fast',
  },
  announcements: {
    pause: 'Paused.',
    resume: 'Resumed.',
    courseStart: 'Course started.',
    courseFinish: (course: string, result: string, penalties: number) => `Course finished. ${course}: ${result}.${penalties > 0 ? ` Includes ${penalties} s in missed-gate penalties.` : ''}`,
    gameOver: 'Eaten. Game over.',
    gatePass: 'Gate passed.',
    gateMiss: 'Gate missed. Plus 5 seconds.',
    land: (score: number) => `Landed. ${styleAnnouncement(score)}`,
    crash: (score: number, includeStyle: boolean) => includeStyle ? `Crashed. ${styleAnnouncement(score)}` : 'Crashed.',
    fastOn: 'Fast mode on.',
    fastOff: 'Fast mode off.',
    jump: 'Jump.',
    trick: 'Trick completed.',
    newGame: 'New game.',
    monster: 'Something large and bald is approaching.',
  },
}
