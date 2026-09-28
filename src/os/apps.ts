import type { ComponentType } from 'react'
import type { Address } from 'viem'
import { useAccount } from 'wagmi'
import { Admin } from '../apps/Admin'
import { Approvals } from '../apps/Approvals'
import { DisplayProperties } from '../apps/DisplayProperties'
import { Gallery } from '../apps/Gallery'
import { LaunchControl } from '../apps/LaunchControl'
import { Legacy } from '../apps/Legacy'
import { Paint } from '../apps/Paint'
import { Recovery } from '../apps/Recovery'
import { Trader } from '../apps/Trader'
import { Vault } from '../apps/Vault'
import { Welcome } from '../apps/Welcome'
import { isAdmin, teamRole } from '../lib/launch'

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
  /** Listed only for ADMINS; the hash route still opens it (the app then asks for an admin wallet). */
  admin?: boolean
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
  { id: 'gallery', title: 'Remy Gallery', short: 'Gallery', desc: 'Browse all 4,490 Remys', icon: 'gallery', size: [800, 600], Component: Gallery },
  { id: 'paint', title: 'Remy Paint', short: 'Remy Paint', desc: 'Make a Remy meme', icon: 'paint', size: [940, 640], Component: Paint },
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
    id: 'admin',
    title: 'Remy Admin',
    short: 'Remy Admin',
    desc: 'Holders, whales and stuck Remys',
    icon: 'admin',
    size: [1000, 680],
    admin: true,
    Component: Admin,
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
  const admin = isAdmin(address)
  return APPS.filter((a) => !a.hidden && (!a.team || team) && (!a.admin || admin))
}
