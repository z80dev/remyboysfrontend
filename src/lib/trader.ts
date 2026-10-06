import { type Address, type Hex, concatHex, decodeEventLog, encodeAbiParameters, isAddressEqual, parseAbiParameters, toHex } from 'viem'
import { readContract } from 'wagmi/actions'
import { erc20Abi, permit2Abi, poolEventsAbi, positionManagerAbi } from '../abis'
import { ADDR, NEW } from '../config'
import { config } from '../wagmi'
import { useDataSnapshot } from './data'
import type { DataSnapshot } from './data-schema'
import { deadline } from './format'
import { type PoolKey, poolId } from './pool'
import type { TxStep } from './tx'
import { type Range, ethPriceAtSqrt } from './v4math'

export const POOL_KEY: PoolKey = {
  currency0: '0x0000000000000000000000000000000000000000',
  currency1: NEW.fremy,
  fee: 10_000,
  tickSpacing: 200,
  hooks: '0x0000000000000000000000000000000000000000',
}
export const POOL_ID = poolId(POOL_KEY)

/** Base produces a block every 2 s; trade times are derived from block numbers instead of one getBlock per trade. */
const BLOCK_TIME = 2
const DAY_BLOCKS = 86_400n / BigInt(BLOCK_TIME)
/* --- Pool market data ------------------------------------------------------------------------------------ */

export type Trade = {
  side: 'buy' | 'sell'
  fremy: bigint
  eth: bigint
  price: number
  block: bigint
  time: number
  hash: Hex
  key: string
}
export type PricePoint = { block: bigint; time: number; price: number }

export type PoolData = {
  sqrtPriceX96: bigint
  tick: number
  price: number
  /** Total swap fee in pips (LP fee plus Uniswap protocol fee), as V4Quoter charges it. */
  swapFee: number
  lpFee: number
  liquidity: bigint
  latestBlock: bigint
  now: number
  trades: Trade[]
  series: PricePoint[]
  ranges: Range[]
  change24h: number | undefined
  /** true when the pool is younger than a day and the change is measured from its opening price. */
  changeSinceOpen: boolean
  volume24hEth: bigint
  trades24h: number
}

function poolFromSnapshot(snapshot: DataSnapshot): PoolData {
  const latest = { number: BigInt(snapshot.block.number), timestamp: BigInt(snapshot.block.timestamp) }
  const slot0 = [BigInt(snapshot.pool.slot0[0]), ...snapshot.pool.slot0.slice(1)] as [bigint, number, number, number]
  const liquidity = BigInt(snapshot.pool.liquidity)
  const logs = snapshot.logs
  const timeOf = (block: bigint) => Number(latest.timestamp) - Number(latest.number - block) * BLOCK_TIME
  const trades: Trade[] = []
  const series: PricePoint[] = []
  const byRange = new Map<string, Range>()
  for (const l of logs) {
    const ev = decodeEventLog({ abi: poolEventsAbi, topics: l.topics as [Hex, ...Hex[]], data: l.data })
    const block = BigInt(l.blockNumber)
    if (ev.eventName === 'Initialize') series.push({ block, time: timeOf(block), price: ethPriceAtSqrt(ev.args.sqrtPriceX96) })
    else if (ev.eventName === 'Swap') {
      // Deltas are the swapper's: negative = paid into the pool.
      const { amount0, amount1, sqrtPriceX96 } = ev.args
      const price = ethPriceAtSqrt(sqrtPriceX96)
      const buy = amount1 > 0n
      trades.push({
        side: buy ? 'buy' : 'sell',
        fremy: buy ? amount1 : -amount1,
        eth: amount0 < 0n ? -amount0 : amount0,
        price,
        block,
        time: timeOf(block),
        hash: l.transactionHash,
        key: `${l.transactionHash}-${l.logIndex}`,
      })
      series.push({ block, time: timeOf(block), price })
    } else if (ev.eventName === 'ModifyLiquidity') {
      const k = `${ev.args.tickLower}:${ev.args.tickUpper}`
      const r = byRange.get(k) ?? { tickLower: ev.args.tickLower, tickUpper: ev.args.tickUpper, liquidity: 0n }
      r.liquidity += ev.args.liquidityDelta
      byRange.set(k, r)
    }
  }
  const [sqrtPriceX96, tick, protocolFee, lpFee] = slot0
  const price = ethPriceAtSqrt(sqrtPriceX96)
  // zeroForOne (buys) use the low 12 bits of the protocol fee; the pool charges protocol + lp - protocol*lp/1e6.
  const proto = protocolFee & 0xfff
  const swapFee = proto + lpFee - Math.floor((proto * lpFee) / 1_000_000)
  const dayAgo = latest.number - DAY_BLOCKS
  const before = series.filter((p) => p.block <= dayAgo)
  const ref = before.length ? before[before.length - 1] : series[0]
  const recent = trades.filter((t) => t.block > dayAgo)
  return {
    sqrtPriceX96,
    tick,
    price,
    swapFee,
    lpFee,
    liquidity,
    latestBlock: latest.number,
    now: Number(latest.timestamp),
    trades: trades.reverse(),
    series: [...series, { block: latest.number, time: Number(latest.timestamp), price }],
    ranges: [...byRange.values()].filter((r) => r.liquidity > 0n),
    change24h: ref ? (price - ref.price) / ref.price : undefined,
    changeSinceOpen: !before.length,
    volume24hEth: recent.reduce((s, t) => s + t.eth, 0n),
    trades24h: recent.length,
  }
}

export function usePoolData() {
  const query = useDataSnapshot()
  const data = query.data?.poolId === POOL_ID ? poolFromSnapshot(query.data) : undefined
  return { ...query, data }
}

/* --- Positions ------------------------------------------------------------------------------------------- */

export type Position = {
  tokenId: bigint
  tickLower: number
  tickUpper: number
  liquidity: bigint
  amount0: bigint
  amount1: bigint
  fee0: bigint
  fee1: bigint
  inRange: boolean
}

export function usePositions(owner: Address | undefined, _sqrtP: bigint | undefined) {
  const query = useDataSnapshot()
  const data: Position[] | undefined =
    query.data && owner
      ? query.data.positions
          .filter((p) => isAddressEqual(p.owner, owner))
          .map((p) => ({
            ...p,
            tokenId: BigInt(p.tokenId),
            liquidity: BigInt(p.liquidity),
            amount0: BigInt(p.amount0),
            amount1: BigInt(p.amount1),
            fee0: BigInt(p.fee0),
            fee1: BigInt(p.fee1),
          }))
          .sort((a, b) => (a.tokenId < b.tokenId ? 1 : -1))
      : undefined
  return { ...query, data }
}

/* --- PositionManager action scripts ---------------------------------------------------------------------- */

/** v4-periphery Actions ids (src/libraries/Actions.sol). */
const A = {
  DECREASE_LIQUIDITY: 0x01,
  MINT_POSITION: 0x02,
  BURN_POSITION: 0x03,
  SETTLE_PAIR: 0x0d,
  TAKE_PAIR: 0x11,
  SWEEP: 0x14,
} as const

const KEY_T = '(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)'
const pair = encodeAbiParameters(parseAbiParameters('address, address'), [POOL_KEY.currency0, POOL_KEY.currency1])

function script(actions: number[], params: Hex[]): Hex {
  return encodeAbiParameters(parseAbiParameters('bytes, bytes[]'), [concatHex(actions.map((a) => toHex(a, { size: 1 }))), params])
}

const modify = (label: string, unlockData: Hex, value?: bigint): TxStep => ({
  label,
  request: {
    address: ADDR.positionManager,
    abi: positionManagerAbi,
    functionName: 'modifyLiquidities',
    args: [unlockData, deadline()],
    value,
  },
})

/**
 * Mint steps: fREMY → Permit2 approval and Permit2 → PositionManager allowance (each skipped when already enough),
 * then MINT_POSITION + SETTLE_PAIR, plus SWEEP to refund unused ETH when ETH is paid in.
 */
export function mintSteps(owner: Address, p: { tickLower: number; tickUpper: number; liquidity: bigint; amount0Max: bigint; amount1Max: bigint }): TxStep[] {
  const steps: TxStep[] = []
  if (p.amount1Max > 0n) {
    steps.push({
      label: 'Approve fREMY for Permit2',
      request: async () =>
        (await readContract(config, {
          address: NEW.fremy,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [owner, ADDR.permit2],
        })) >= p.amount1Max
          ? null
          : { address: NEW.fremy, abi: erc20Abi, functionName: 'approve', args: [ADDR.permit2, p.amount1Max] },
    })
    steps.push({
      label: 'Allow the Position Manager to use fREMY',
      request: async () => {
        const [amount, expiration] = await readContract(config, {
          address: ADDR.permit2,
          abi: permit2Abi,
          functionName: 'allowance',
          args: [owner, NEW.fremy, ADDR.positionManager],
        })
        const now = Math.floor(Date.now() / 1000)
        return amount >= p.amount1Max && expiration > now + 600
          ? null
          : {
              address: ADDR.permit2,
              abi: permit2Abi,
              functionName: 'approve',
              args: [NEW.fremy, ADDR.positionManager, p.amount1Max, now + 3600],
            }
      },
    })
  }
  const mint = encodeAbiParameters(parseAbiParameters(`${KEY_T}, int24, int24, uint256, uint128, uint128, address, bytes`), [
    POOL_KEY,
    p.tickLower,
    p.tickUpper,
    p.liquidity,
    p.amount0Max,
    p.amount1Max,
    owner,
    '0x',
  ])
  const eth = p.amount0Max > 0n
  const actions = eth ? [A.MINT_POSITION, A.SETTLE_PAIR, A.SWEEP] : [A.MINT_POSITION, A.SETTLE_PAIR]
  const params = eth ? [mint, pair, encodeAbiParameters(parseAbiParameters('address, address'), [POOL_KEY.currency0, owner])] : [mint, pair]
  steps.push(modify('Add liquidity', script(actions, params), eth ? p.amount0Max : undefined))
  return steps
}

const decrease = (tokenId: bigint, liquidity: bigint, min0: bigint, min1: bigint) =>
  encodeAbiParameters(parseAbiParameters('uint256, uint256, uint128, uint128, bytes'), [tokenId, liquidity, min0, min1, '0x'])
const take = (recipient: Address) => encodeAbiParameters(parseAbiParameters('address, address, address'), [POOL_KEY.currency0, POOL_KEY.currency1, recipient])

/** Collect fees: DECREASE_LIQUIDITY by 0 settles the fees owed, TAKE_PAIR sends them to the owner. */
export const collectStep = (tokenId: bigint, owner: Address) =>
  modify(`Collect fees on #${tokenId}`, script([A.DECREASE_LIQUIDITY, A.TAKE_PAIR], [decrease(tokenId, 0n, 0n, 0n), take(owner)]))

/** Remove part of a position (also collects its fees). `min0/min1` bound slippage on what comes out. */
export const removeStep = (tokenId: bigint, owner: Address, liquidity: bigint, min0: bigint, min1: bigint, pct: number) =>
  modify(`Remove ${pct}% of #${tokenId}`, script([A.DECREASE_LIQUIDITY, A.TAKE_PAIR], [decrease(tokenId, liquidity, min0, min1), take(owner)]))

/** Close: BURN_POSITION removes all remaining liquidity plus fees and burns the NFT; TAKE_PAIR pays it out. */
export const closeStep = (tokenId: bigint, owner: Address, min0: bigint, min1: bigint) =>
  modify(
    `Close position #${tokenId}`,
    script(
      [A.BURN_POSITION, A.TAKE_PAIR],
      [encodeAbiParameters(parseAbiParameters('uint256, uint128, uint128, bytes'), [tokenId, min0, min1, '0x']), take(owner)],
    ),
  )
