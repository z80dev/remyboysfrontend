import { floorRelativeRange, nearestTickForEthPrice } from './v4math.ts'

export type LiquidityMode = 'sell' | 'buy' | 'both'
export type RangeWidth = 'close' | 'balanced' | 'wide'
export type RangeSelection = {
  mode: LiquidityMode
  minMultiple: number
  maxMultiple: number
  exact?: { min: string; max: string }
}

const WIDTHS = {
  sell: { close: [1, 1.25], balanced: [1, 10 / 3], wide: [1, 10] },
  buy: { close: [0.8, 1], balanced: [2 / 3, 1], wide: [0.25, 1] },
  both: { close: [0.8, 1.25], balanced: [0.5, 2], wide: [0.25, 4] },
} as const

export function liquiditySelection(mode: LiquidityMode, width: RangeWidth = 'balanced'): RangeSelection {
  const [minMultiple, maxMultiple] = WIDTHS[mode][width]
  return { mode, minMultiple, maxMultiple }
}

export const sliderValue = (multiple: number, spacing: number) =>
  Math.round(Math.log(multiple) / Math.log(1.0001) / spacing)
export const sliderMultiple = (value: number, spacing: number) => 1.0001 ** (value * spacing)

/** Keep edited prices when returning to sliders, within their supported width and single-token boundaries. */
export function sliderSelection(minMultiple: number, maxMultiple: number, spacing: number): RangeSelection {
  const mode = minMultiple >= 1 ? 'sell' : maxMultiple <= 1 ? 'buy' : 'both'
  const limit = sliderValue(10, spacing)
  let low = sliderValue(minMultiple, spacing)
  let high = sliderValue(maxMultiple, spacing)
  if (mode === 'sell') {
    low = Math.max(0, Math.min(limit - 2, low))
    high = Math.max(low + 2, Math.min(limit, high))
  } else if (mode === 'buy') {
    high = Math.min(0, Math.max(-limit + 2, high))
    low = Math.max(-limit, Math.min(high - 2, low))
  } else {
    low = Math.max(-limit, Math.min(-2, low))
    high = Math.min(limit, Math.max(2, high))
  }
  return { mode, minMultiple: sliderMultiple(low, spacing), maxMultiple: sliderMultiple(high, spacing) }
}

export function resolveLiquidityRange(sqrtPrice: bigint, selection: RangeSelection, spacing: number) {
  if (!selection.exact) {
    const range = floorRelativeRange(sqrtPrice, selection.minMultiple, selection.maxMultiple, spacing)
    return { range, error: range ? undefined : 'Widen your range or enter supported prices in ETH.' }
  }
  const min = Number(selection.exact.min)
  const max = Number(selection.exact.max)
  const tickUpper = nearestTickForEthPrice(min, spacing)
  const tickLower = nearestTickForEthPrice(max, spacing)
  if (tickUpper === undefined || tickLower === undefined)
    return { error: 'Enter positive prices within the supported range.' }
  if (max <= min) return { error: 'Upper price must be above lower price.' }
  if (tickLower >= tickUpper) return { error: 'These prices round to the same step. Widen your range.' }
  return { range: { tickLower, tickUpper }, error: undefined }
}
