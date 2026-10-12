import { Tile } from '../types'
import { LEGEND, type LegendEntry } from './build'

export const CHALLENGE_LEGEND: Readonly<Record<string, LegendEntry>> = {
  ...LEGEND,
  '%': Tile.ForceRandom,
  '8': Tile.ThinN, '6': Tile.ThinE, '2': Tile.ThinS, '4': Tile.ThinW, '5': Tile.ThinSE,
  '7': Tile.IceNW, '9': Tile.IceNE, '1': Tile.IceSW, '3': Tile.IceSE
}
