import type { ComponentType } from 'react'
import type { Address } from 'viem'
import { useAccount } from 'wagmi'
import { Remix } from '../apps/Remix'
import { Approvals } from '../apps/Approvals'
import { DisplayProperties } from '../apps/DisplayProperties'
import { Gallery } from '../apps/Gallery'
import { Haunt } from '../apps/Haunt'
import { LaunchControl } from '../apps/LaunchControl'
import { Legacy } from '../apps/Legacy'
import { Quest } from '../apps/Quest'
import { Recovery } from '../apps/Recovery'
import { Send } from '../apps/Send'
import { Trader } from '../apps/Trader'
import { TextEdit } from '../apps/TextEdit'
import { Vault } from '../apps/Vault'
import { Welcome } from '../apps/Welcome'
import { teamRole } from '../lib/launch'

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
  { id: 'remix', title: 'Remy Remix Studio', short: 'Remix Studio', desc: 'Reimagine original Remy art', icon: 'remix', size: [980, 720], Component: Remix },
  { id: 'textedit', title: 'Remy TextEdit', short: 'TextEdit', desc: 'A word processor in Wingdings', icon: 'textedit', size: [640, 480], Component: TextEdit },
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
]

export const appById = (id: string) => APPS.find((a) => a.id === id)

export const isTeam = (address?: Address) => teamRole(address) !== undefined

/** Apps listed on the desktop, Start menu and Today screen for the connected wallet. */
export function useVisibleApps() {
  const { address } = useAccount()
  const team = isTeam(address)
  return APPS.filter((a) => !a.hidden && (!a.team || team))
}
