import { MAX_TICK, MIN_TICK, ethPriceAtSqrt, getSqrtPriceAtTick, getTickAtSqrtPrice } from './v4math.ts'

/*
 * Ranges are edited in price steps: q = -tick, so ETH per fREMY = 1.0001^q rises with q and the UI never has to
 * think about the pool's inverted orientation. A range is [low, high] in steps on the tick-spacing grid.
 *
 * An edge may be anchored to the market ('spot') instead of a fixed step. A sell range that starts at the market
 * keeps starting at the market as the price moves, so it always needs fREMY only (and a bid range ending at the
 * market always needs ETH only). Every other edge is an absolute price that stays put.
 */

export type Edge = number | 'spot'
export type RangeSelection = { low: Edge; high: Edge }
export type RangeSide = 'sell' | 'buy' | 'both'

const LN_STEP = Math.log(1.0001)

/** Highest usable step on the grid; the lowest is its negative. */
export const maxStep = (spacing: number) => Math.floor(MAX_TICK / spacing) * spacing
export const priceAtStep = (q: number) => 1.0001 ** q
/** Fractional step of a price (not snapped). */
export const stepOfPrice = (price: number) => Math.log(price) / LN_STEP

const snap = (q: number, spacing: number) => Math.max(-maxStep(spacing), Math.min(maxStep(spacing), Math.round(q / spacing) * spacing))

/** Nearest grid step for an ETH-per-fREMY price, clamped to the usable range (0 and ∞ map to the outermost steps). */
export function stepForPrice(price: number, spacing: number): number | undefined {
  if (price === 0) return -maxStep(spacing)
  if (!(price > 0)) return undefined
  return price === Number.POSITIVE_INFINITY ? maxStep(spacing) : snap(stepOfPrice(price), spacing)
}

/** True when the pool price is one the tick math can place on the grid. */
export const spotSupported = (sqrtP: bigint) => sqrtP >= getSqrtPriceAtTick(MIN_TICK) && sqrtP < getSqrtPriceAtTick(MAX_TICK)

/**
 * Where market-anchored edges land. `ask` is the lowest grid step at or above the price (asks start there and need
 * fREMY only); `bid` is the highest grid step at or below it (bids end there and need ETH only). They coincide
 * only when the price sits exactly on a grid tick.
 */
export function spotSteps(sqrtP: bigint, spacing: number) {
  const floorTick = Math.floor(getTickAtSqrtPrice(sqrtP) / spacing) * spacing
  const onGrid = getSqrtPriceAtTick(floorTick) === sqrtP
  return { ask: -floorTick, bid: onGrid ? -floorTick : -(floorTick + spacing), at: stepOfPrice(ethPriceAtSqrt(sqrtP)) }
}

/** Raw edge steps, anchors resolved against the current price. */
export function edgeSteps(sqrtP: bigint, sel: RangeSelection, spacing: number) {
  const spot = spotSteps(sqrtP, spacing)
  return { low: sel.low === 'spot' ? spot.ask : sel.low, high: sel.high === 'spot' ? spot.bid : sel.high }
}

/** Pool ticks for a selection at the current price, or why it cannot be minted. */
export function resolveRange(sqrtP: bigint, sel: RangeSelection, spacing: number): { range?: { tickLower: number; tickUpper: number }; error?: string } {
  if (!spotSupported(sqrtP)) return { error: 'The pool price is outside the range the app can quote.' }
  const { low, high } = edgeSteps(sqrtP, sel, spacing)
  const max = maxStep(spacing)
  if (low % spacing !== 0 || high % spacing !== 0 || low < -max || high > max) return { error: 'Those prices are outside the pool’s supported range.' }
  if (low >= high) {
    if (sel.low === 'spot') return { error: 'The price has climbed past your upper price. Raise it to keep selling above the market.' }
    if (sel.high === 'spot') return { error: 'The price has dropped below your lower price. Lower it to keep buying below the market.' }
    return { error: 'The upper price must be at least one step above the lower price.' }
  }
  return { range: { tickLower: -high, tickUpper: -low } }
}

/** Quick ranges per side. `factor` multiplies (sell), divides (buy) or brackets (both) the current price. */
export const PRESETS: Record<RangeSide, { label: string; factor: number }[]> = {
  sell: [
    { label: '+10%', factor: 1.1 },
    { label: '+25%', factor: 1.25 },
    { label: '+50%', factor: 1.5 },
    { label: '2×', factor: 2 },
    { label: '5×', factor: 5 },
    { label: '10×', factor: 10 },
    { label: '100×', factor: 100 },
    { label: 'No limit', factor: Number.POSITIVE_INFINITY },
  ],
  buy: [
    { label: '−10%', factor: 1 / 0.9 },
    { label: '−25%', factor: 1 / 0.75 },
    { label: '−50%', factor: 2 },
    { label: '−75%', factor: 4 },
    { label: '−90%', factor: 10 },
    { label: '−99%', factor: 100 },
  ],
  both: [
    { label: '±10%', factor: 1.1 },
    { label: '±25%', factor: 1.25 },
    { label: '½× – 2×', factor: 2 },
    { label: '⅕× – 5×', factor: 5 },
    { label: 'Full range', factor: Number.POSITIVE_INFINITY },
  ],
}

/** A quick range at the current price. Sell and buy ranges anchor their near edge to the market. */
export function presetSelection(sqrtP: bigint, side: RangeSide, factor: number, spacing: number): RangeSelection {
  const spot = spotSteps(sqrtP, spacing)
  const max = maxStep(spacing)
  const price = ethPriceAtSqrt(sqrtP)
  const up = factor === Number.POSITIVE_INFINITY ? max : (stepForPrice(price * factor, spacing) ?? max)
  const down = factor === Number.POSITIVE_INFINITY ? -max : (stepForPrice(price / factor, spacing) ?? -max)
  if (side === 'sell') return { low: 'spot', high: Math.min(max, Math.max(up, spot.ask + spacing)) }
  if (side === 'buy') return { low: Math.max(-max, Math.min(down, spot.bid - spacing)), high: 'spot' }
  // Strictly around the price: one full step below `ask` and above `bid` keeps the price inside.
  return { low: Math.max(-max, Math.min(down, spot.ask - spacing)), high: Math.min(max, Math.max(up, spot.bid + spacing)) }
}

export const sameSelection = (a: RangeSelection, b: RangeSelection) => a.low === b.low && a.high === b.high

/**
 * Move one edge to step `q` (snapped and clamped). The edges keep at least one step between them, and an edge that
 * lands on the market's ask (low) or bid (high) re-anchors to the market.
 */
export function setEdge(sqrtP: bigint, sel: RangeSelection, which: 'low' | 'high', q: number, spacing: number): RangeSelection {
  const spot = spotSteps(sqrtP, spacing)
  const cur = edgeSteps(sqrtP, sel, spacing)
  let step = snap(q, spacing)
  if (which === 'low') {
    step = Math.min(step, cur.high - spacing)
    return { ...sel, low: step === spot.ask ? 'spot' : step }
  }
  step = Math.max(step, cur.low + spacing)
  return { ...sel, high: step === spot.bid ? 'spot' : step }
}

/** Slide the whole range by `delta` steps, keeping its width, inside the usable range. */
export function shiftRange(sqrtP: bigint, from: { low: number; high: number }, delta: number, spacing: number): RangeSelection {
  const max = maxStep(spacing)
  const d = Math.max(-max - from.low, Math.min(max - from.high, Math.round(delta / spacing) * spacing))
  const spot = spotSteps(sqrtP, spacing)
  const low = from.low + d
  const high = from.high + d
  return { low: low === spot.ask ? 'spot' : low, high: high === spot.bid ? 'spot' : high }
}

/**
 * Parse what a user typed for a price: a plain ETH price ("0.004"), a change from the market ("+25%", "-10%"), a
 * multiple of the market ("2x"), or the open ends "0" and "∞". Returns the ETH price (0 or Infinity for the ends),
 * or undefined when the text is not a price.
 */
export function parsePrice(text: string, market: number): number | undefined {
  const t = text.trim().replace(/[,\s]/g, '').replace(/[−–]/g, '-').toLowerCase()
  if (!t) return undefined
  if (t === '∞' || t === 'inf' || t === 'infinity') return Number.POSITIVE_INFINITY
  const pct = t.match(/^([+-]?(?:\d+\.?\d*|\.\d+))%$/)
  if (pct) {
    const v = Number(pct[1])
    return v >= -100 ? market * (1 + v / 100) : undefined
  }
  const mult = t.match(/^(?:(\d+\.?\d*|\.\d+)[x×]|[x×](\d+\.?\d*|\.\d+))$/)
  if (mult) return market * Number(mult[1] ?? mult[2])
  if (!/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/.test(t)) return undefined
  const v = Number(t)
  return Number.isFinite(v) ? v : Number.POSITIVE_INFINITY
}

/** ETH price at an edge; the outermost usable steps stand for the open ends 0 and ∞. */
export function edgePrice(q: number, spacing: number): number {
  if (q >= maxStep(spacing)) return Number.POSITIVE_INFINITY
  return q <= -maxStep(spacing) ? 0 : priceAtStep(q)
}

/** ETH price for display across any magnitude the pool supports. */
export function formatPrice(p: number): string {
  if (p === Number.POSITIVE_INFINITY) return '∞'
  if (!Number.isFinite(p) || p < 0) return '—'
  if (p === 0) return '0'
  if (p >= 1e-6 && p < 1e9) return String(Number(p.toPrecision(4)))
  return p.toExponential(2).replace('e+', 'e')
}

/** How far a price is from the market, in words that stay readable at extreme multiples. */
export function formatFromMarket(price: number, market: number): string {
  const r = price / market
  if (r === Number.POSITIVE_INFINITY) return 'no upper limit'
  if (r === 0) return 'down to zero'
  if (!(r > 0) || !Number.isFinite(r)) return '—'
  if (Math.abs(r - 1) < 0.0005) return 'at market'
  if (r >= 10) return `${Number(r.toPrecision(3)).toLocaleString('en-US')}× market`
  if (r <= 0.01) return `${Number((1 / r).toPrecision(3)).toLocaleString('en-US')}× below`
  const pct = (r - 1) * 100
  return `${pct > 0 ? '+' : '−'}${Math.abs(pct).toFixed(Math.abs(pct) < 10 ? 1 : 0)}%`
}
