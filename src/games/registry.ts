import type { ComponentType, ReactNode } from 'react'
import type { AppProps } from '../os/apps'
import pinballIcon from './pinball/icon'

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
    id: 'pinball',
    title: '3D Pinball for Remy OS - Base Cadet',
    short: 'Pinball',
    desc: 'Rise from Cadet to Fleet Admiral on Base',
    size: [608, 476],
    icon: pinballIcon,
    load: () => import('./pinball'),
  },
]
