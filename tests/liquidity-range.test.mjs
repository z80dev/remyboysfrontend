import assert from 'node:assert/strict'
import { test } from 'node:test'
import { liquiditySelection, resolveLiquidityRange, sliderMultiple, sliderSelection } from '../src/lib/liquidityRange.ts'
import { getSqrtPriceAtTick, rangeSide } from '../src/lib/v4math.ts'

const spacing = 200

test('all quick widths require the intended tokens as the live floor moves', () => {
  for (const tick of [65000, 52001, 73099, -52001]) {
    const sqrtP = getSqrtPriceAtTick(tick)
    for (const mode of ['sell', 'buy', 'both']) {
      for (const width of ['close', 'balanced', 'wide']) {
        const { range, error } = resolveLiquidityRange(sqrtP, liquiditySelection(mode, width), spacing)
        assert.equal(error, undefined)
        assert.ok(range)
        assert.equal(rangeSide(sqrtP, range.tickLower, range.tickUpper), mode === 'sell' ? 'fremy' : mode === 'buy' ? 'eth' : 'both')
      }
    }
  }
})

test('slider ranges follow the live floor; exact prices keep the reviewed ticks', () => {
  const first = getSqrtPriceAtTick(65000)
  const later = getSqrtPriceAtTick(52001)
  const selection = liquiditySelection('sell')
  assert.notDeepEqual(resolveLiquidityRange(first, selection, spacing).range, resolveLiquidityRange(later, selection, spacing).range)
  const exact = { ...selection, exact: { min: '0.002', max: '0.01' } }
  assert.deepEqual(resolveLiquidityRange(first, exact, spacing).range, resolveLiquidityRange(later, exact, spacing).range)
})

test('minimum slider separation produces valid ranges across tick rounding boundaries', () => {
  for (const tick of [65000, 65199, 65200]) {
    const sqrtP = getSqrtPriceAtTick(tick)
    for (const [mode, low, high] of [['sell', 0, 2], ['buy', -2, 0], ['both', -2, 2]]) {
      const selection = { mode, minMultiple: sliderMultiple(low, spacing), maxMultiple: sliderMultiple(high, spacing) }
      const { range } = resolveLiquidityRange(sqrtP, selection, spacing)
      assert.ok(range)
      assert.equal(rangeSide(sqrtP, range.tickLower, range.tickUpper), mode === 'sell' ? 'fremy' : mode === 'buy' ? 'eth' : 'both')
    }
  }
})

test('empty, inverted and collapsed exact ranges cannot create a position', () => {
  const sqrtP = getSqrtPriceAtTick(65000)
  for (const [min, max] of [['', '0.01'], ['0.01', '0.002'], ['0.002', '0.002001'], ['.', '0.01']]) {
    const result = resolveLiquidityRange(sqrtP, { ...liquiditySelection('sell'), exact: { min, max } }, spacing)
    assert.equal(result.range, undefined)
    assert.ok(result.error)
  }
})

test('returning from exact prices keeps the intended side and clamps distant prices to valid slider bounds', () => {
  const sqrtP = getSqrtPriceAtTick(65199)
  for (const [min, max, expected] of [[1, 2, 'sell'], [0.5, 1, 'buy'], [0.5, 2, 'both'], [100, 1000, 'sell'], [0.001, 0.002, 'buy']]) {
    const selection = sliderSelection(min, max, spacing)
    assert.equal(selection.mode, expected)
    const { range } = resolveLiquidityRange(sqrtP, selection, spacing)
    assert.ok(range)
    assert.equal(rangeSide(sqrtP, range.tickLower, range.tickUpper), expected === 'sell' ? 'fremy' : expected === 'buy' ? 'eth' : 'both')
  }
  const selection = sliderSelection(1, 2, spacing)
  assert.ok(Math.abs(selection.maxMultiple - 2) < 0.03)
})
