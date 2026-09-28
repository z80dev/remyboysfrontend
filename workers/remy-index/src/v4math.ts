/*
 * Subset of the site's src/lib/v4math.ts (Uniswap v4 TickMath / SqrtPriceMath in bigint).
 * Pool orientation: currency0 = native ETH, currency1 = fREMY, so ETH per fREMY is the inverse of the pool price.
 */

const Q96 = 1n << 96n
const MAX_UINT256 = (1n << 256n) - 1n
const MAX_TICK = 887272

const mulDiv = (a: bigint, b: bigint, d: bigint) => (a * b) / d

const TICK_FACTORS: [number, bigint][] = [
  [0x2, 0xfff97272373d413259a46990580e213an],
  [0x4, 0xfff2e50f5f656932ef12357cf3c7fdccn],
  [0x8, 0xffe5caca7e10e4e61c3624eaa0941cd0n],
  [0x10, 0xffcb9843d60f6159c9db58835c926644n],
  [0x20, 0xff973b41fa98c081472e6896dfb254c0n],
  [0x40, 0xff2ea16466c96a3843ec78b326b52861n],
  [0x80, 0xfe5dee046a99a2a811c461f1969c3053n],
  [0x100, 0xfcbe86c7900a88aedcffc83b479aa3a4n],
  [0x200, 0xf987a7253ac413176f2b074cf7815e54n],
  [0x400, 0xf3392b0822b70005940c7a398e4b70f3n],
  [0x800, 0xe7159475a2c29b7443b29c7fa6e889d9n],
  [0x1000, 0xd097f3bdfd2022b8845ad8f792aa5825n],
  [0x2000, 0xa9f746462d870fdf8a65dc1f90e061e5n],
  [0x4000, 0x70d869a156d2a1b890bb3df62baf32f7n],
  [0x8000, 0x31be135f97d08fd981231505542fcfa6n],
  [0x10000, 0x9aa508b5b7a84e1c677de54f3e99bc9n],
  [0x20000, 0x5d6af8dedb81196699c329225ee604n],
  [0x40000, 0x2216e584f5fa1ea926041bedfe98n],
  [0x80000, 0x48a170391f7dc42444e8fa2n],
]

/** TickMath.getSqrtPriceAtTick, bit-exact. */
export function getSqrtPriceAtTick(tick: number): bigint {
  const abs = Math.abs(tick)
  if (abs > MAX_TICK) throw new Error(`tick ${tick} out of range`)
  let price = abs & 0x1 ? 0xfffcb933bd6fad37aa2d162d1a594001n : 1n << 128n
  for (const [bit, factor] of TICK_FACTORS) if (abs & bit) price = (price * factor) >> 128n
  if (tick > 0) price = MAX_UINT256 / price
  return (price + (1n << 32n) - 1n) >> 32n
}

/** ETH per fREMY at a pool sqrt price. */
export function ethPriceAtSqrt(sqrtPriceX96: bigint): number {
  const s = Number(sqrtPriceX96) / 2 ** 96
  return 1 / (s * s)
}

/** Token amounts held by `liquidity` over [sqrtA, sqrtB] at `sqrtP`, rounded down (SqrtPriceMath deltas). */
export function amountsForLiquidity(sqrtP: bigint, sqrtA: bigint, sqrtB: bigint, liquidity: bigint) {
  const amount0 = (lo: bigint, hi: bigint) => mulDiv(liquidity << 96n, hi - lo, hi) / lo
  const amount1 = (lo: bigint, hi: bigint) => mulDiv(liquidity, hi - lo, Q96)
  if (sqrtP <= sqrtA) return { amount0: amount0(sqrtA, sqrtB), amount1: 0n }
  if (sqrtP >= sqrtB) return { amount0: 0n, amount1: amount1(sqrtA, sqrtB) }
  return { amount0: amount0(sqrtP, sqrtB), amount1: amount1(sqrtA, sqrtP) }
}
