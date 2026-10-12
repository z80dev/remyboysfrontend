import type { ComponentType, ReactNode } from 'react'
import type { AppProps } from '../os/apps'
import freecellIcon from './freecell/icon'
import heartsIcon from './hearts/icon'
import solitaireIcon from './solitaire/icon'
import spiderIcon from './spider/icon'
import gorillasIcon from './gorillas/icon'
import jezzbaldIcon from './jezzbald/icon'
import minesweeperIcon from './minesweeper/icon'
import nibblesIcon from './nibbles/icon'
import pinballIcon from './pinball/icon'
import pipeDreamIcon from './pipe-dream/icon'
import challengeIcon from './remys-challenge/icon'
import revengeIcon from './remys-revenge/icon'
import reversiIcon from './reversi/icon'
import { skiFreeIcon } from './skifree/icon'
import taipeiIcon from './taipei/icon'

/** A lazy-loaded classic game, shared by the shell, Games folder and icon lookup. */
export type GameDef = {
  id: string
  title: string
  short: string
  desc: string
  size: [number, number]
  icon: ReactNode
  load: () => Promise<{ default: ComponentType<AppProps> }>
  resizable?: boolean
}

/** Installed games. Icons must be self-contained SVG content or a 32×32 SVG element. */
export const GAMES: GameDef[] = [
  {
    id: 'freecell',
    title: 'FreeCell',
    short: 'FreeCell',
    desc: 'Every deal winnable. Well, almost.',
    size: [640, 510],
    icon: freecellIcon,
    load: () => import('./freecell'),
  },
  {
    id: 'hearts',
    title: 'The Remy Hearts Network',
    short: 'Hearts',
    desc: 'Take no hearts. Dodge the Rug Lord.',
    size: [648, 540],
    icon: heartsIcon,
    load: () => import('./hearts'),
  },
  {
    id: 'solitaire',
    title: 'Solitaire',
    short: 'Solitaire',
    desc: 'Klondike, dealt from the Remy deck',
    size: [600, 490],
    icon: solitaireIcon,
    load: () => import('./solitaire'),
    resizable: true,
  },
  {
    id: 'spider',
    title: 'Spider Solitaire',
    short: 'Spider Solitaire',
    desc: 'Eight runs, ten piles, zero Cabald',
    size: [808, 620],
    icon: spiderIcon,
    load: () => import('./spider'),
    resizable: true,
  },
  {
    id: 'gorillas',
    title: 'Remy Gorillas',
    short: 'Gorillas',
    desc: 'QBasic classic: angle, velocity, banana',
    size: [648, 410],
    icon: gorillasIcon,
    load: () => import('./gorillas'),
    resizable: false,
  },
  {
    id: 'jezzbald',
    title: 'JezzBald',
    short: 'JezzBald',
    desc: 'Box in the Cabald. Clear 75%.',
    size: [616, 436],
    icon: jezzbaldIcon,
    load: () => import('./jezzbald'),
    resizable: false,
  },
  {
    id: 'minesweeper',
    title: 'Minesweeper',
    short: 'Minesweeper',
    desc: 'Find the Cabald without waking it',
    size: [172, 280],
    icon: minesweeperIcon,
    load: () => import('./minesweeper'),
    resizable: false,
  },
  {
    id: 'nibbles',
    title: 'Remy Nibbles',
    short: 'Nibbles',
    desc: 'QBasic classic: eat the numbers, don\'t bite yourself',
    size: [648, 460],
    icon: nibblesIcon,
    load: () => import('./nibbles'),
    resizable: false,
  },
  {
    id: 'pinball',
    title: '3D Pinball for Remy OS - Base Cadet',
    short: 'Pinball',
    desc: 'Rise from Cadet to Fleet Admiral on Base',
    size: [608, 476],
    icon: pinballIcon,
    load: () => import('./pinball'),
  },
  {
    id: 'pipe-dream',
    title: 'Pipe Dream',
    short: 'Pipe Dream',
    desc: 'Lay pipe before the liquidity flows',
    size: [592, 484],
    icon: pipeDreamIcon,
    load: () => import('./pipe-dream'),
  },
  {
    id: 'remys-challenge',
    title: "Remy's Challenge",
    short: "Remy's Challenge",
    desc: '40 levels. Collect the chips. Mind the Cabald.',
    size: [552, 476],
    icon: challengeIcon,
    load: () => import('./remys-challenge'),
    resizable: false,
  },
  {
    id: 'remys-revenge',
    title: 'Remy\'s Revenge',
    short: 'Remy\'s Revenge',
    desc: 'Trap the Cabald\'s cats. Eat the cheese.',
    size: [408, 506],
    icon: revengeIcon,
    load: () => import('./remys-revenge'),
    resizable: false,
  },
  {
    id: 'reversi',
    title: 'Reversi',
    short: 'Reversi',
    desc: 'Hair versus bald, flip for flip',
    size: [408, 480],
    icon: reversiIcon,
    load: () => import('./reversi'),
    resizable: true,
  },
  {
    id: 'skifree',
    title: 'SkiFree',
    short: 'SkiFree',
    desc: 'Ski Mempool Mountain. Mind the bald guy.',
    size: [648, 500],
    icon: skiFreeIcon,
    load: () => import('./skifree'),
    resizable: true,
  },
  {
    id: 'taipei',
    title: 'Taipei',
    short: 'Taipei',
    desc: 'Match the tiles. Free the Remys.',
    size: [648, 540],
    icon: taipeiIcon,
    load: () => import('./taipei'),
    resizable: true,
  },
]
