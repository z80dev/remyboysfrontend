import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  MAX_TICK,
  MIN_TICK,
  ethPriceAtSqrt,
  ethPriceAtTick,
  floorRelativeRange,
  getSqrtPriceAtTick,
  positionFor,
  rangeSide,
} from '../src/lib/v4math.ts'

const spacing = 200
const presets = [
  { min: 1, max: 10, side: 'fremy' },
  { min: 1, max: 10 / 3, side: 'fremy' },
  { min: 2 / 3, max: 1, side: 'eth' },
]

test('every preset follows rising and falling floors with the intended width and deposit token', () => {
  // Launch floor, higher floor, lower floor, and prices across zero/negative ticks.
  for (const tick of [65000, 52001, 73099, 1, -52001]) {
    const sqrtP = getSqrtPriceAtTick(tick)
    const floor = ethPriceAtSqrt(sqrtP)
    for (const { min, max, side } of presets) {
      const range = floorRelativeRange(sqrtP, min, max, spacing)
      assert.ok(range)
      const { tickLower, tickUpper } = range
      assert.ok(tickLower < tickUpper)
      assert.ok(tickLower % spacing === 0)
      assert.ok(tickUpper % spacing === 0)
      // Rounding each edge must stay within one grid step of its target.
      const step = 1.0001 ** spacing
      for (const [actual, target] of [[ethPriceAtTick(tickUpper), floor * min], [ethPriceAtTick(tickLower), floor * max]]) {
        assert.ok(actual / target >= 1 / step && actual / target <= step)
      }
      assert.equal(rangeSide(sqrtP, tickLower, tickUpper), side)
      const pos = positionFor(sqrtP, tickLower, tickUpper, side, 10n ** 18n)
      assert.ok(pos.liquidity > 0n)
      assert.equal(side === 'eth' ? pos.amount1 : pos.amount0, 0n)
    }
  }
})

test('asks and bids remain single-sided exactly on grid boundaries and one sqrt-price unit to either side', () => {
  for (const tick of [65000, -52000]) {
    for (const offset of [-1n, 0n, 1n]) {
      const sqrtP = getSqrtPriceAtTick(tick) + offset
      for (const { min, max, side } of presets) {
        const range = floorRelativeRange(sqrtP, min, max, spacing)
        assert.ok(range)
        assert.equal(rangeSide(sqrtP, range.tickLower, range.tickUpper), side)
      }
    }
  }
})

test('unsupported floors and invalid ranges fail closed', () => {
  const sqrtP = getSqrtPriceAtTick(65000)
  for (const [price, min, max, grid] of [
    [0n, 1, 10, spacing],
    [getSqrtPriceAtTick(MIN_TICK), 1, 10, spacing],
    [getSqrtPriceAtTick(MAX_TICK), 2 / 3, 1, spacing],
    [sqrtP, 0, 10, spacing],
    [sqrtP, 10, 1, spacing],
    [sqrtP, 1, Number.POSITIVE_INFINITY, spacing],
    [sqrtP, Number.NaN, 10, spacing],
    [sqrtP, 1, 10, 0],
  ]) assert.equal(floorRelativeRange(price, min, max, grid), undefined)
})
