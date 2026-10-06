/*
 * Uniswap v4 math in bigint, ported from v4-core TickMath / SqrtPriceMath and v4-periphery LiquidityAmounts.
 * Pool orientation here: currency0 = native ETH, currency1 = fREMY, so the pool price is fREMY per ETH and
 * ETH per fREMY (what the UI shows) is its inverse. Lower ticks = more expensive fREMY.
 */

export const Q96 = 1n << 96n
export const Q128 = 1n << 128n
const MAX_UINT256 = (1n << 256n) - 1n
export const MIN_TICK = -887272
export const MAX_TICK = 887272

export const mulDiv = (a: bigint, b: bigint, d: bigint) => (a * b) / d
export const mulDivUp = (a: bigint, b: bigint, d: bigint) => {
  const p = a * b
  return p % d === 0n ? p / d : p / d + 1n
}
const divUp = (a: bigint, b: bigint) => (a % b === 0n ? a / b : a / b + 1n)

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

/** Greatest tick whose sqrt price is <= sqrtPriceX96 (TickMath.getTickAtSqrtPrice semantics). */
export function getTickAtSqrtPrice(sqrtPriceX96: bigint): number {
  const approx = Math.floor(Math.log((Number(sqrtPriceX96) / 2 ** 96) ** 2) / Math.log(1.0001))
  let t = Math.max(MIN_TICK, Math.min(MAX_TICK, approx))
  while (t < MAX_TICK && getSqrtPriceAtTick(t + 1) <= sqrtPriceX96) t++
  while (t > MIN_TICK && getSqrtPriceAtTick(t) > sqrtPriceX96) t--
  return t
}

/**
 * Nearest tick on the spacing grid for an ETH-per-fREMY price (ethPriceAtTick(t) = 1.0001^-t).
 * Undefined for non-positive prices or prices beyond the pool's usable tick range.
 */
export function nearestTickForEthPrice(ethPerFremy: number, spacing: number): number | undefined {
  if (!(ethPerFremy > 0) || !Number.isFinite(ethPerFremy)) return undefined
  const tick = Math.round(-Math.log(ethPerFremy) / Math.log(1.0001) / spacing) * spacing
  return Math.abs(tick) > Math.floor(MAX_TICK / spacing) * spacing ? undefined : tick
}

/** ETH per fREMY at a pool sqrt price. */
export function ethPriceAtSqrt(sqrtPriceX96: bigint): number {
  const s = Number(sqrtPriceX96) / 2 ** 96
  return 1 / (s * s)
}

export const ethPriceAtTick = (tick: number) => 1.0001 ** -tick

/** A price range relative to the live floor, snapped to the pool grid. Floor asks/bids stay single-sided. */
export function floorRelativeRange(sqrtP: bigint, minMultiple: number, maxMultiple: number, spacing: number) {
  if (
    !Number.isInteger(spacing) ||
    spacing <= 0 ||
    !(minMultiple > 0) ||
    !(maxMultiple > minMultiple) ||
    !Number.isFinite(maxMultiple) ||
    sqrtP < getSqrtPriceAtTick(MIN_TICK) ||
    sqrtP > getSqrtPriceAtTick(MAX_TICK)
  ) return undefined
  const floor = ethPriceAtSqrt(sqrtP)
  let tickLower = nearestTickForEthPrice(floor * maxMultiple, spacing)
  let tickUpper = nearestTickForEthPrice(floor * minMultiple, spacing)
  if (tickLower === undefined || tickUpper === undefined) return undefined
  const floorTick = Math.floor(getTickAtSqrtPrice(sqrtP) / spacing) * spacing
  // ETH/fREMY price is inverted: asks start at or above spot; bids end at or below spot.
  if (minMultiple === 1) tickUpper = floorTick
  if (maxMultiple === 1) {
    tickLower = floorTick < MIN_TICK || getSqrtPriceAtTick(floorTick) < sqrtP ? floorTick + spacing : floorTick
  }
  const maxTick = Math.floor(MAX_TICK / spacing) * spacing
  if (tickLower < -maxTick || tickUpper > maxTick || tickLower >= tickUpper) return undefined
  return { tickLower, tickUpper }
}

/* SqrtPriceMath deltas (sqrtA < sqrtB). */
export function amount0Delta(x: bigint, y: bigint, liquidity: bigint, roundUp: boolean): bigint {
  const [sqrtA, sqrtB] = x < y ? [x, y] : [y, x]
  const n1 = liquidity << 96n
  const n2 = sqrtB - sqrtA
  return roundUp ? divUp(mulDivUp(n1, n2, sqrtB), sqrtA) : mulDiv(n1, n2, sqrtB) / sqrtA
}

export function amount1Delta(x: bigint, y: bigint, liquidity: bigint, roundUp: boolean): bigint {
  const [sqrtA, sqrtB] = x < y ? [x, y] : [y, x]
  return roundUp ? mulDivUp(liquidity, sqrtB - sqrtA, Q96) : mulDiv(liquidity, sqrtB - sqrtA, Q96)
}

/* LiquidityAmounts (v4-periphery). */
export function liquidityForAmount0(x: bigint, y: bigint, amount0: bigint): bigint {
  const [sqrtA, sqrtB] = x < y ? [x, y] : [y, x]
  return mulDiv(amount0, mulDiv(sqrtA, sqrtB, Q96), sqrtB - sqrtA)
}

export function liquidityForAmount1(x: bigint, y: bigint, amount1: bigint): bigint {
  const [sqrtA, sqrtB] = x < y ? [x, y] : [y, x]
  return mulDiv(amount1, Q96, sqrtB - sqrtA)
}

/** Token amounts held by `liquidity` over [sqrtA, sqrtB] at `sqrtP` (roundUp = what a mint must pay). */
export function amountsForLiquidity(sqrtP: bigint, x: bigint, y: bigint, liquidity: bigint, roundUp = false) {
  const [sqrtA, sqrtB] = x < y ? [x, y] : [y, x]
  if (sqrtP <= sqrtA) return { amount0: amount0Delta(sqrtA, sqrtB, liquidity, roundUp), amount1: 0n }
  if (sqrtP >= sqrtB) return { amount0: 0n, amount1: amount1Delta(sqrtA, sqrtB, liquidity, roundUp) }
  return { amount0: amount0Delta(sqrtP, sqrtB, liquidity, roundUp), amount1: amount1Delta(sqrtA, sqrtP, liquidity, roundUp) }
}

export type Range = { tickLower: number; tickUpper: number; liquidity: bigint }

/** Which tokens a new range needs at the current price. */
export function rangeSide(sqrtP: bigint, tickLower: number, tickUpper: number): 'eth' | 'fremy' | 'both' {
  if (sqrtP <= getSqrtPriceAtTick(tickLower)) return 'eth'
  if (sqrtP >= getSqrtPriceAtTick(tickUpper)) return 'fremy'
  return 'both'
}

/**
 * Liquidity and amounts for a new position given one side's amount. `side` says which amount the user typed:
 * fREMY (currency1) or ETH (currency0). Straddling ranges derive the other amount from the same liquidity.
 */
export function positionFor(sqrtP: bigint, tickLower: number, tickUpper: number, input: 'eth' | 'fremy', amount: bigint) {
  const sqrtA = getSqrtPriceAtTick(tickLower)
  const sqrtB = getSqrtPriceAtTick(tickUpper)
  let liquidity: bigint
  if (input === 'fremy') liquidity = liquidityForAmount1(sqrtA, sqrtP < sqrtB ? sqrtP : sqrtB, amount)
  else liquidity = liquidityForAmount0(sqrtP > sqrtA ? sqrtP : sqrtA, sqrtB, amount)
  const need = amountsForLiquidity(sqrtP, sqrtA, sqrtB, liquidity, true)
  return { liquidity, amount0: need.amount0, amount1: need.amount1 }
}

/** Aggregate liquidityNet by tick from position ranges. */
function netByTick(ranges: Range[]) {
  const net = new Map<number, bigint>()
  for (const r of ranges) {
    if (r.liquidity === 0n) continue
    net.set(r.tickLower, (net.get(r.tickLower) ?? 0n) + r.liquidity)
    net.set(r.tickUpper, (net.get(r.tickUpper) ?? 0n) - r.liquidity)
  }
  return net
}

/**
 * Simulate buying `fremyOut` fREMY with ETH (price walks to lower ticks) across `ranges`, ignoring the swap fee
 * for the path. Returns the ETH paid before fee, the final price, and how much was filled.
 */
export function simulateBuy(sqrtP: bigint, ranges: Range[], fremyOut: bigint) {
  const net = netByTick(ranges)
  const currentTick = getTickAtSqrtPrice(sqrtP)
  let active = 0n
  for (const r of ranges) if (r.tickLower <= currentTick && currentTick < r.tickUpper) active += r.liquidity
  const below = [...net.keys()].filter((t) => getSqrtPriceAtTick(t) < sqrtP).sort((a, b) => b - a)
  let s = sqrtP
  let left = fremyOut
  let eth = 0n
  for (const b of [...below, null]) {
    const sb = b === null ? 0n : getSqrtPriceAtTick(b)
    if (active > 0n) {
      const avail = amount1Delta(sb, s, active, false)
      if (left <= avail) {
        const next = s - mulDivUp(left, Q96, active)
        eth += amount0Delta(next, s, active, true)
        return { ethIn: eth, sqrtAfter: next, filled: fremyOut }
      }
      eth += amount0Delta(sb, s, active, true)
      left -= avail
    }
    if (b === null) break
    s = sb
    active -= net.get(b) ?? 0n
  }
  return { ethIn: eth, sqrtAfter: s, filled: fremyOut - left }
}

/** fREMY and ETH held by `ranges` inside the tick band [tickA, tickB]. */
export function bandDepth(sqrtP: bigint, ranges: Range[], tickA: number, tickB: number) {
  let fremy = 0n
  let eth = 0n
  for (const r of ranges) {
    const lo = Math.max(r.tickLower, tickA)
    const hi = Math.min(r.tickUpper, tickB)
    if (lo >= hi || r.liquidity <= 0n) continue
    const a = amountsForLiquidity(sqrtP, getSqrtPriceAtTick(lo), getSqrtPriceAtTick(hi), r.liquidity)
    fremy += a.amount1
    eth += a.amount0
  }
  return { fremy, eth }
}

/** Uncollected fees for a position from StateView fee growth (uint256 wraparound, like the pool). */
export function uncollectedFees(inside0: bigint, inside1: bigint, last0: bigint, last1: bigint, liquidity: bigint) {
  const wrap = (x: bigint) => ((x % (1n << 256n)) + (1n << 256n)) % (1n << 256n)
  return { fee0: mulDiv(wrap(inside0 - last0), liquidity, Q128), fee1: mulDiv(wrap(inside1 - last1), liquidity, Q128) }
}

/** PositionInfo packing: | 200 bits poolId | 24 tickUpper | 24 tickLower | 8 hasSubscriber |. */
export function decodePositionInfo(info: bigint) {
  const int24 = (v: bigint) => {
    const x = Number(v & 0xffffffn)
    return x >= 0x800000 ? x - 0x1000000 : x
  }
  return { tickLower: int24(info >> 8n), tickUpper: int24(info >> 32n) }
}
