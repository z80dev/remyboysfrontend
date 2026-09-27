import type { ComponentType } from 'react'
import { Approvals } from '../apps/Approvals'
import { Gallery } from '../apps/Gallery'
import { Legacy } from '../apps/Legacy'
import { Paint } from '../apps/Paint'
import { Recovery } from '../apps/Recovery'
import { Vault } from '../apps/Vault'
import { Welcome } from '../apps/Welcome'

export type AppProps = { param?: string; navigate: (hash: string) => void }

export type AppDef = {
  id: string
  title: string
  short: string
  icon: string
  accent: string
  size: [number, number]
  Component: ComponentType<AppProps>
}

export const APPS: AppDef[] = [
  { id: 'welcome', title: 'Welcome to Remy OS', short: 'Welcome', icon: 'home', accent: '#3a8ee6', size: [620, 560], Component: Welcome },
  { id: 'recovery', title: 'Recovery Center', short: 'Recovery', icon: 'recovery', accent: '#2fa36b', size: [640, 620], Component: Recovery },
  { id: 'approvals', title: 'Approvals Manager', short: 'Approvals', icon: 'approvals', accent: '#d08a1c', size: [600, 600], Component: Approvals },
  { id: 'legacy', title: 'Legacy Exchange', short: 'Exchange', icon: 'exchange', accent: '#7d5bd6', size: [640, 620], Component: Legacy },
  { id: 'vault', title: 'Remy Vault', short: 'Vault', icon: 'vault', accent: '#1f6fd1', size: [860, 660], Component: Vault },
  { id: 'gallery', title: 'Gallery', short: 'Gallery', icon: 'gallery', accent: '#d2476b', size: [760, 620], Component: Gallery },
  { id: 'paint', title: 'Remy Paint', short: 'Paint', icon: 'paint', accent: '#e0632a', size: [940, 660], Component: Paint },
]

export const appById = (id: string) => APPS.find((a) => a.id === id)
