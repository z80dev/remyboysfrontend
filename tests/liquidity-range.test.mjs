import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  PRESETS,
  edgeSteps,
  maxStep,
  parsePrice,
  presetSelection,
  priceAtStep,
  resolveRange,
  setEdge,
  shiftRange,
  spotSteps,
} from '../src/lib/liquidityRange.ts'
import {
  amountsForLiquidity,
  ethPriceAtSqrt,
  getSqrtPriceAtTick,
  positionFor,
  rangeSide,
  simulateBuy,
  simulateSell,
} from '../src/lib/v4math.ts'

const spacing = 200
const TOKENS = { sell: 'fremy', buy: 'eth', both: 'both' }
// Live-like prices, prices on a grid tick and one sqrt unit either side of it, and negative ticks.
const prices = [65000, 58101, 52001, 1, -52001].map(getSqrtPriceAtTick)
for (const t of [65000, -52000]) for (const d of [-1n, 1n]) prices.push(getSqrtPriceAtTick(t) + d)

test('every quick range resolves to the intended deposit token at any market price', () => {
  for (const sqrtP of prices) {
    for (const side of ['sell', 'buy', 'both']) {
      for (const { factor } of PRESETS[side]) {
        const { range, error } = resolveRange(sqrtP, presetSelection(sqrtP, side, factor, spacing), spacing)
        assert.equal(error, undefined)
        assert.equal(rangeSide(sqrtP, range.tickLower, range.tickUpper), TOKENS[side], `${side} ×${factor}`)
        assert.ok(positionFor(sqrtP, range.tickLower, range.tickUpper, side === 'buy' ? 'eth' : 'fremy', 10n ** 18n).liquidity > 0n)
      }
    }
  }
})

test('quick ranges land within one pool step of their target price', () => {
  const sqrtP = getSqrtPriceAtTick(58101)
  const market = ethPriceAtSqrt(sqrtP)
  const step = 1.0001 ** spacing
  for (const [side, factor, edge, target] of [
    ['sell', 10, 'high', market * 10],
    ['buy', 4, 'low', market / 4],
    ['both', 2, 'low', market / 2],
    ['both', 2, 'high', market * 2],
  ]) {
    const q = edgeSteps(sqrtP, presetSelection(sqrtP, side, factor, spacing), spacing)[edge]
    const ratio = priceAtStep(q) / target
    assert.ok(ratio >= 1 / step && ratio <= step, `${side} ${edge}: ${ratio}`)
  }
})

test('open-ended ranges reach the outermost usable ticks and still mint', () => {
  const sqrtP = getSqrtPriceAtTick(58101)
  const max = maxStep(spacing)
  const full = resolveRange(sqrtP, presetSelection(sqrtP, 'both', Number.POSITIVE_INFINITY, spacing), spacing).range
  assert.deepEqual(full, { tickLower: -max, tickUpper: max })
  const pos = positionFor(sqrtP, full.tickLower, full.tickUpper, 'fremy', 10n ** 18n)
  assert.ok(pos.liquidity > 0n && pos.amount0 > 0n)
  const ask = resolveRange(sqrtP, presetSelection(sqrtP, 'sell', Number.POSITIVE_INFINITY, spacing), spacing).range
  assert.equal(ask.tickLower, -max)
  assert.equal(rangeSide(sqrtP, ask.tickLower, ask.tickUpper), 'fremy')
})

test('market-anchored edges follow the price; fixed edges stay put', () => {
  const first = getSqrtPriceAtTick(58101)
  const later = getSqrtPriceAtTick(56000)
  const sel = presetSelection(first, 'sell', 3, spacing)
  const a = resolveRange(first, sel, spacing).range
  const b = resolveRange(later, sel, spacing).range
  assert.equal(a.tickLower, b.tickLower)
  assert.notEqual(a.tickUpper, b.tickUpper)
  assert.equal(rangeSide(later, b.tickLower, b.tickUpper), 'fremy')
  // The price climbing through the fixed upper edge leaves nothing to sell above the market.
  const result = resolveRange(getSqrtPriceAtTick(a.tickLower - 400), sel, spacing)
  assert.equal(result.range, undefined)
  assert.match(result.error, /upper price/)
})

test('editing an edge keeps a valid range and re-anchors at the market', () => {
  const sqrtP = getSqrtPriceAtTick(58101)
  const spot = spotSteps(sqrtP, spacing)
  const sel = { low: spot.ask + 2000, high: spot.ask + 4000 }
  // Dragging the low edge past the high edge stops one step below it.
  assert.deepEqual(setEdge(sqrtP, sel, 'low', spot.ask + 9000, spacing), { low: spot.ask + 3800, high: spot.ask + 4000 })
  // Landing on the market's ask anchors the low edge, so the ask keeps tracking the price.
  assert.equal(setEdge(sqrtP, sel, 'low', spot.ask + 30, spacing).low, 'spot')
  // Edges clamp to the usable range instead of failing.
  assert.equal(setEdge(sqrtP, sel, 'high', 10 ** 9, spacing).high, maxStep(spacing))
  const bid = setEdge(sqrtP, { low: spot.bid - 4000, high: spot.bid - 2000 }, 'high', spot.bid, spacing)
  assert.equal(bid.high, 'spot')
  assert.equal(resolveRange(sqrtP, bid, spacing).error, undefined)
})

test('sliding a range keeps its width inside the usable ticks', () => {
  const sqrtP = getSqrtPriceAtTick(58101)
  const max = maxStep(spacing)
  const moved = shiftRange(sqrtP, { low: 1000, high: 3000 }, 10 ** 9, spacing)
  assert.deepEqual(moved, { low: max - 2000, high: max })
  const spot = spotSteps(sqrtP, spacing)
  assert.equal(shiftRange(sqrtP, { low: spot.ask - 600, high: spot.ask + 1000 }, 610, spacing).low, 'spot')
})

test('price input accepts prices, market changes, multiples and open ends', () => {
  const m = 0.003
  assert.equal(parsePrice('0.004', m), 0.004)
  assert.equal(parsePrice('1,000.5', m), 1000.5)
  assert.ok(Math.abs(parsePrice('+25%', m) - 0.00375) < 1e-12)
  assert.ok(Math.abs(parsePrice('−10%', m) - 0.0027) < 1e-12)
  assert.ok(Math.abs(parsePrice('3x', m) - 0.009) < 1e-12)
  assert.equal(parsePrice('∞', m), Number.POSITIVE_INFINITY)
  assert.equal(parsePrice('0', m), 0)
  for (const bad of ['', 'abc', '-5', '-150%', '1.2.3', '%']) assert.equal(parsePrice(bad, m), undefined, bad)
})

test('a price sitting exactly on a range edge trades only the side that range holds', () => {
  const T = 58000
  const L = 10n ** 20n
  const sqrtP = getSqrtPriceAtTick(T)
  const range = { tickLower: T, tickUpper: T + spacing, liquidity: L }
  // At its lower tick the range is all ETH: nothing to sell to buyers, but it bids for fREMY.
  assert.equal(simulateBuy(sqrtP, [range], 10n ** 18n).filled, 0n)
  const held = amountsForLiquidity(sqrtP, getSqrtPriceAtTick(T), getSqrtPriceAtTick(T + spacing), L)
  assert.equal(held.amount1, 0n)
  const sell = simulateSell(sqrtP, [range], 10n ** 30n)
  assert.ok(sell.filled > 0n && sell.filled < 10n ** 30n)
  assert.ok(sell.ethOut <= held.amount0 && held.amount0 - sell.ethOut <= 1n)
  // Once the range is used up the price rests at its far edge.
  assert.equal(sell.sqrtAfter, getSqrtPriceAtTick(T + spacing))
})
