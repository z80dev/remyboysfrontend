// STILL HERE — the Remy Boys trailer. Every cue in the film lives here: shots, beats,
// captions and the score all import this file, so re-timing a moment is one edit.
// Grid: 120 BPM, bar = 2 s. All cuts land on the bar grid.

export const T = {
  // ACT I — boot (0–8): BIOS 0–2.4, Remy OS xp boot logo 2.4–6, desktop reveals 6–8
  boot: 0,
  bootLogo: 2.4,
  desk: 6,
  dblclick: 7,

  // ACT II — genesis (8–16): the wall of Remys builds, counter ticks to 4,490
  genesis: 8,
  wallDone: 14.5,

  // ACT III — golden (16–24): the OS world — gallery, Remyamp, games
  golden: 16,

  // ACT IV — the turn (24–26): glitch storm, the world breaks
  turn: 24,

  // ACT V — dark (26–34): the Cabald wall 26–29, RUG LORD zoom 29–31.5, BSOD 31.5–34
  dark: 26,
  ruglord: 29,
  bsod: 31.5,

  // ACT VI — the floor (34–42): crash chart, falling Remys, THE FLOOR slam at 37
  floor: 34,
  floorSlam: 37,

  // ACT VII — recovery (42–52): the V, Remys rise back, Recovery Center window 45
  recovery: 42,
  recoveryWin: 45,
  rise: 48,

  // ACT VIII — title (52–64): REMY BOYS 52.5, STILL HERE. 57, end card 60.5
  title: 52,
  titleSlam: 52.5,
  stillHere: 57,
  endcard: 60.5,
  end: 64,
}

export const BEAT = 0.5

export const SHOTS = [
  ['boot', T.boot, T.genesis],
  ['genesis', T.genesis, T.golden],
  ['golden', T.golden, T.turn],
  ['turn', T.turn, T.dark],
  ['dark', T.dark, T.floor],
  ['floor', T.floor, T.recovery],
  ['recovery', T.recovery, T.title],
  ['title', T.title, T.end],
]

// Cast — the same named faces as Remy Quest (src/games/kit/remy.ts CAST), art indices
// into media/remy/Character<i>.webp. DAN's 5757 wraps the 4,490 collection: 5757 % 4490.
export const CAST = {
  RUG_LORD: 67,
  NOBODY: 10,
  SHORT: 1010,
  SQUEEZE: 57,
  ESCROW: 2086,
  AMY: 60,
  CARL: 2038,
  DAN: 1267,
  RAY: 1000,
  GWEI: 46,
  RIVAL: 42,
  NURSE: 14,
  CLERK: 6,
  MAXI: 2084,
  GOLD: 2002,
  CURATOR: 2016,
}

export const HERO = 2069 // the baguette boy — guest account picture, de-facto mascot

// Brand colours (src/os/icons.tsx FLAG_COLORS) + the Luna chrome palette (src/styles.css)
export const FLAG = ['#f0532d', '#7cc220', '#1f9bf0', '#ffbe1a']
export const LUNA = {
  titleA: '#0a5ef0', titleB: '#0055e3', titleC: '#003494',
  frame: '#0055e5', face: '#ece9d8', faceDark: '#aca899',
  taskA: '#1f3a9e', taskB: '#2359d5', taskC: '#183f9f', trayA: '#0c5ab9', trayB: '#1293e2',
  ok: '#2b7a0b', bad: '#b2230e',
}

// Wall of Remys: 20×8 tiles of 96×100 = 1920×800, centred in the letterboxed band
export const MOSAIC = { cols: 20, rows: 8, tw: 96, th: 100, y: 140 }

export const SEED = { mosaic: 4490, cabald: 67, golden: 16, floor: 34 }

// Caption copy (declared as data in film.js; lint checks their holds)
export const COPY = {
  k1: 'BASE CHAIN · NOVEMBER 2023',
  c1: '4,490 hand-drawn Remys were born.\nOne community grew around them.',
  c2: 'They built a world of their own —\ngames, music, a whole operating system.',
  k3: 'THE EXPLOIT · SEPTEMBER 2026',
  c3: 'Then the payment processor\nbetrayed them.',
  c4: 'Mint. Marketplace. Liquidity.\nEverything fell to THE FLOOR.',
  k5: 'THE RECOVERY',
  c5: 'But the boys held the line —\nand took it all back.',
}
