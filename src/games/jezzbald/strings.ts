const number = new Intl.NumberFormat('en-US').format

export const strings = {
  title: 'JezzBald',
  start: 'Box in the Cabald. Clear 75%.',
  game: '&Game', options: '&Options', help: '&Help', newGame: '&New', pause: '&Pause', scores: '&High Scores…', exit: 'E&xit',
  sound: '&Sound', fast: '&Fast', reveal: '&Reveal Pictures', contents: '&Contents', about: '&About JezzBald…',
  helpTitle: 'JezzBald Help', scoreTitle: 'JezzBald High Scores', nameTitle: 'New High Score',
  tabs: ['Rules', 'Scoring', 'Keyboard', 'Tips'],
  helpText: [
    'Build a horizontal or vertical wall from an open cell. Both halves grow one cell every 40 milliseconds. ' +
      'Each half completes independently. A Cabald atom touching a growing half destroys that half and costs one life. ' +
      'Regions containing no atoms are filled. Clear at least 75% to advance. Level n begins with n + 1 atoms and lives, ' +
      'up to a maximum of 50 from level 49. The time limit remains 20 × (level + 1) + 40 seconds. ' +
      'No lives or no time remaining ends the game.',
    'Each cleared cell earns the level number in points. At 80% or more, the area bonus is ' +
      '(whole percent cleared − 75) × 1,000 × level. The lives bonus is lives remaining × 500 × level. ' +
      'The time bonus is seconds remaining × 20 × level. Bonus multipliers always use the actual level number. ' +
      'Fast increases atom speed by half and doubles all points. Speed changes take effect at the next level or new game. ' +
      'The ten best completed-game scores are saved.',
    'Arrows move the cell cursor. Space builds a wall. R or Tab changes orientation. Right-click changes orientation. ' +
      'F2 starts a new game. F3 pauses or resumes. F1 opens Help. On touch, tap to build; use two fingers or the ' +
      'orientation button to change direction. Hold an open cell for 450 milliseconds to change direction and build. ' +
      'Click or press a key to resume after switching windows.',
    'Begin with a short wall near an edge. Watch both halves, since one may survive the other. ' +
      'A finished wall does not fill a region that still contains an atom. Click the revealed portrait to view the tally. ' +
      'Matching scalps are not evidence.',
  ],
  version: '5.1 (Build 2600.remy_sp2.4490)', flavour: 'We shaved for aerodynamics.',
  aboutLines: ['Remade for the Remy Boys community, 2026.', 'After JezzBall (1992) by Dima Pavlovsky.',
    'This product is licensed to: Remy Boy', 'Remys available to Remy OS: 4,490'],
  paused: 'Paused', resume: 'Click or press a key to resume.', resumeTouch: 'Tap to resume.', resumeButton: 'Resume', levelComplete: 'Level Complete!',
  areaBonus: 'Area bonus', livesBonus: 'Lives bonus', timeBonus: 'Time bonus', total: 'Total', next: 'Next Level',
  tallyPrompt: 'Click or press a key to view the level tally.', tallyTouch: 'Tap to view the level tally.',
  over: 'Game Over', overMessage: 'The Cabald thanks you for your service. It denies having a service.',
  lifeLost: 'Matching scalps. Pure coincidence.', anonymous: 'Anonymous', orientation: 'Change Wall Orientation',
  horizontal: '↔', vertical: '↕', build: 'Build Wall', level: 'Level', lives: 'Lives', area: 'Area cleared', score: 'Score', time: 'Time left',
  number,
  fastPending: (fast: boolean) => `${fast ? 'Fast' : 'Normal speed'} takes effect next level or new game.`,
  caption: (level: number, idx: number, epithet: string) => `Level ${level}: Remy #${idx}${epithet ? ` — ${epithet}` : ''}`,
  levelAnnouncement: (level: number) => `Level ${level} started.`,
  scoreAnnouncement: (area: number, score: number) => `${area}% cleared. Score ${number(score)}.`,
  lostAnnouncement: (lives: number) =>
    `A growing wall was destroyed. ${lives === 0 ? 'No lives remain.' : lives === 1 ? '1 life remains.' : `${lives} lives remain.`}`,
  entry: (score: number) => `Your score of ${number(score)} is one of the ten best. Enter your name.`,
  rank: (rank: number) => String(rank),
  jingle: 'Plausible Partition',
}
