import { LAYOUT_IDS, type LayoutId } from './engine'
import type { TileSet } from './render'

export type BestTime = { seconds: number; name: string }
export type Preferences = { layout: LayoutId; solvable: boolean; timer: boolean; highlight: boolean; set: TileSet; best: Partial<Record<LayoutId, BestTime>> }
export const defaults: Preferences = { layout: 'standard', solvable: true, timer: false, highlight: false, set: 'remy', best: {} }
export function isPreferences(value: unknown): value is Preferences {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Preferences
  if (!LAYOUT_IDS.includes(p.layout) || typeof p.solvable !== 'boolean' || typeof p.timer !== 'boolean' || typeof p.highlight !== 'boolean'
    || !['remy', 'classic'].includes(p.set) || !p.best || typeof p.best !== 'object' || Array.isArray(p.best)) return false
  return Object.entries(p.best).every(([id, best]) => LAYOUT_IDS.includes(id as LayoutId) && best !== null && typeof best === 'object'
    && Number.isInteger(best.seconds) && best.seconds >= 0 && typeof best.name === 'string' && best.name.length <= 32)
}
