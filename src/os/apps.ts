import { type ComponentType, Suspense, createElement, lazy } from 'react'
import type { Address } from 'viem'
import { useAccount } from 'wagmi'
import { Approvals } from '../apps/Approvals'
import { DisplayProperties } from '../apps/DisplayProperties'
import { Gallery } from '../apps/Gallery'
import { Haunt } from '../apps/Haunt'
import { Harvest } from '../apps/Harvest'
import { LaunchControl } from '../apps/LaunchControl'
import { Legacy } from '../apps/Legacy'
import { Quest } from '../apps/Quest'
import { Recovery } from '../apps/Recovery'
import { Remix } from '../apps/Remix'
import { Send } from '../apps/Send'
import { TextEdit } from '../apps/TextEdit'
import { Trader } from '../apps/Trader'
import { Vault } from '../apps/Vault'
import { Welcome } from '../apps/Welcome'
import { Winamp } from '../apps/Winamp'
import { REMYFLIX_URL } from '../config'
import GamesFolder from '../games/folder'
import { GAMES } from '../games/registry'
import { teamRole } from '../lib/launch'
import { Loading } from './ui'

const Remygotchi = lazy(() => import('../pet'))

export type AppProps = { param?: string; navigate: (hash: string) => void; close: () => void }

export type AppDef = {
  id: string
  title: string
  /** Desktop icon / taskbar label. */
  short: string
  /** Start menu subtitle. */
  desc: string
  icon: string
  size: [number, number]
  /** Not on the desktop or in the Start menu programs list (opened from elsewhere). */
  hidden?: boolean
  /** Listed only for the team wallets in TEAM; the hash route still opens it for anyone. */
  team?: boolean
  /** Fixed-size dialog chrome: close button only, no resize. */
  dialog?: boolean
  /** Fixed-size apps retain minimize but cannot maximize or drag a resize grip. */
  resizable?: boolean
  /** Games are listed in the Games folder and All Programs cascade only. */
  game?: boolean
  /** No Luna frame: the app paints its own skinned chrome (ChromeContext in Window.tsx). `size` only places it. */
  skinned?: boolean
  /** Retains the hidden physical frame/client; all open apps keep their React instance until closed. */
  persistent?: boolean
  Component: ComponentType<AppProps>
}

export const APPS: AppDef[] = [
  { id: 'welcome', title: 'Welcome to Remy OS', short: 'Remy OS', desc: 'Start here', icon: 'computer', size: [720, 580], Component: Welcome },
  {
    id: 'recovery',
    title: 'Recovery Center',
    short: 'Recovery Center',
    desc: 'Reclaim Remys lost in the exploit',
    icon: 'recovery',
    size: [720, 600],
    Component: Recovery,
  },
  {
    id: 'approvals',
    title: 'Approvals Manager',
    short: 'Approvals',
    desc: 'See who can move your Remys',
    icon: 'approvals',
    size: [680, 560],
    Component: Approvals,
  },
  {
    id: 'legacy',
    title: 'Legacy Exchange',
    short: 'Legacy Exchange',
    desc: 'Turn rbREMY and wREMY into fREMY',
    icon: 'exchange',
    size: [700, 600],
    Component: Legacy,
  },
  { id: 'vault', title: 'Remy Vault', short: 'Remy Vault', desc: 'Buy, sell and redeem Remys', icon: 'vault', size: [880, 620], Component: Vault },
  {
    id: 'trader',
    title: 'Remy Trader',
    short: 'Remy Trader',
    desc: 'Trade fREMY and make markets',
    icon: 'trader',
    size: [980, 680],
    Component: Trader,
  },
  { id: 'send', title: 'Send fREMY', short: 'Send fREMY', desc: 'Transfer fREMY to any wallet', icon: 'coin', size: [520, 460], Component: Send },
  { id: 'gallery', title: 'Remy Gallery', short: 'Gallery', desc: 'Browse all 4,490 Remys', icon: 'gallery', size: [800, 600], Component: Gallery },
  {
    id: 'pet',
    title: 'Remygotchi',
    short: 'Remygotchi',
    desc: 'Raise your Remy, keep the daily streak',
    icon: 'pet',
    size: [900, 690],
    Component: (props) => createElement(Suspense, { fallback: createElement(Loading, null, 'Hatching…') }, createElement(Remygotchi, props)),
  },
  { id: 'remix', title: 'Remy Remix Studio', short: 'Remix Studio', desc: 'Reimagine original Remy art', icon: 'remix', size: [980, 720], Component: Remix },
  { id: 'textedit', title: 'Remy TextEdit', short: 'TextEdit', desc: 'A word processor in Wingdings', icon: 'textedit', size: [640, 480], Component: TextEdit },
  {
    id: 'winamp',
    title: 'Winamp',
    short: 'Winamp',
    desc: 'It really whips the llama’s ass',
    icon: 'winamp',
    size: [275, 464],
    skinned: true,
    persistent: true,
    Component: Winamp,
  },
  { id: 'quest', title: 'Remy Quest', short: 'Remy Quest', desc: 'A Remy adventure on Base', icon: 'quest', size: [900, 660], Component: Quest },
  {
    id: 'halloween',
    title: 'Night of the Cabald',
    short: 'Night of the Cabald',
    desc: 'Halloween shooter: survive the Cabald',
    icon: 'pumpkin',
    size: [860, 640],
    Component: Haunt,
  },
  {
    id: 'harvest',
    title: "Remy's Harvest",
    short: "Remy's Harvest",
    desc: "Indigenous Peoples' Day: catch the corn",
    icon: 'corn',
    size: [640, 680],
    Component: Harvest,
  },
  {
    id: 'launch',
    title: 'Launch Control',
    short: 'Launch Control',
    desc: 'Team checklist for the vault launch',
    icon: 'launch',
    size: [780, 640],
    team: true,
    Component: LaunchControl,
  },
  {
    id: 'display',
    title: 'Display Properties',
    short: 'Display',
    desc: 'Wallpaper and colour scheme',
    icon: 'display',
    size: [410, 474],
    hidden: true,
    dialog: true,
    Component: DisplayProperties,
  },
  {
    id: 'games',
    title: 'Games',
    short: 'Games',
    desc: 'Classic games for Remy OS',
    icon: 'games',
    size: [640, 480],
    Component: GamesFolder,
  },
  ...GAMES.map((game): AppDef => {
    const Component = lazy(game.load)
    return {
      id: game.id,
      title: game.title,
      short: game.short,
      desc: game.desc,
      icon: game.id,
      size: game.size,
      resizable: game.resizable,
      game: true,
      persistent: true,
      Component: (props) => createElement(Suspense, { fallback: createElement(Loading, null, 'Loading game…') }, createElement(Component, props)),
    }
  }),
]

export const appById = (id: string) => APPS.find((a) => a.id === id)

/** What the desktop, Start menu and Today screen list: a window app or an external-site launcher. */
export type Launcher = Pick<AppDef, 'id' | 'title' | 'short' | 'desc' | 'icon'>

/** A launcher that opens another site in a new tab instead of a Remy OS window. Never a hash route. */
export type LinkDef = Launcher & { href: string; /** Listed right after this app id. */ after: string }

export const LINK_APPS: LinkDef[] = [
  { id: 'remyflix', title: 'RemyFlix', short: 'RemyFlix', desc: 'Stream the Remy films', icon: 'remyflix', href: REMYFLIX_URL, after: 'winamp' },
]

export const linkById = (id: string) => LINK_APPS.find((l) => l.id === id)

export const isTeam = (address?: Address) => teamRole(address) !== undefined

/** Launchers listed on the desktop, Start menu and Today screen for the connected wallet. */
export function useVisibleApps() {
  const { address } = useAccount()
  const team = isTeam(address)
  const listed: Launcher[] = APPS.filter((a) => !a.hidden && !a.game && (!a.team || team))
  for (const l of LINK_APPS) {
    const at = listed.findIndex((a) => a.id === l.after)
    listed.splice(at < 0 ? listed.length : at + 1, 0, l)
  }
  return listed
}
