import { useQuery } from '@tanstack/react-query'
import { type Address, type Hex, concatHex, decodeEventLog, encodeAbiParameters, encodeEventTopics, isAddressEqual, pad, parseAbiParameters, toHex } from 'viem'
import { getBlock, getPublicClient, readContract, readContracts } from 'wagmi/actions'
import { erc20Abi, permit2Abi, poolEventsAbi, positionManagerAbi, stateViewAbi } from '../abis'
import { ADDR, NEW, POOL_START_BLOCK, RPC_URL } from '../config'
import { config } from '../wagmi'
import { deadline } from './format'
import { type PoolKey, poolId } from './pool'
import type { TxStep } from './tx'
import { type Range, amountsForLiquidity, decodePositionInfo, ethPriceAtSqrt, getSqrtPriceAtTick, uncollectedFees } from './v4math'

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
const CHUNK = 2_000n

/* --- Log scanning ---------------------------------------------------------------------------------------- */

type RawLog = { blockNumber: string; logIndex: number; transactionHash: Hex; topics: Hex[]; data: Hex }
type Cache = { to: string; logs: RawLog[] }

const cacheKey = (name: string) => `remyxp.logs.${RPC_URL ?? 'base'}.${name}`

/**
 * eth_getLogs over [from, latest] in ≤2,000-block chunks, one request at a time (the public RPC rate-limits),
 * cached in localStorage so later refreshes only fetch new blocks.
 */
async function scanLogs(name: string, address: Address, topics: (Hex | Hex[] | null)[], latest: bigint): Promise<RawLog[]> {
  const client = getPublicClient(config)
  let cache: Cache = { to: (POOL_START_BLOCK - 1n).toString(), logs: [] }
  try {
    const saved = localStorage.getItem(cacheKey(name))
    if (saved) cache = JSON.parse(saved)
  } catch {}
  // A fork restarted below the cached head: start over.
  if (BigInt(cache.to) > latest) cache = { to: (POOL_START_BLOCK - 1n).toString(), logs: [] }
  for (let from = BigInt(cache.to) + 1n; from <= latest; from += CHUNK) {
    const to = from + CHUNK - 1n < latest ? from + CHUNK - 1n : latest
    const logs = (await client.request({
      method: 'eth_getLogs',
      params: [{ address, topics, fromBlock: toHex(from), toBlock: toHex(to) }],
    })) as RawLog[]
    cache = {
      to: to.toString(),
      logs: [...cache.logs, ...logs.map((l) => ({ ...l, blockNumber: BigInt(l.blockNumber).toString(), logIndex: Number(l.logIndex) }))],
    }
    try {
      localStorage.setItem(cacheKey(name), JSON.stringify(cache))
    } catch {}
    if (to < latest) await new Promise((r) => setTimeout(r, 250))
  }
  return cache.logs
}

/* --- Pool market data ------------------------------------------------------------------------------------ */

export type Trade = { side: 'buy' | 'sell'; fremy: bigint; eth: bigint; price: number; block: bigint; time: number; hash: Hex; key: string }
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

const topicsFor = (name: 'Initialize' | 'Swap' | 'ModifyLiquidity') => encodeEventTopics({ abi: poolEventsAbi, eventName: name })[0] as Hex

async function loadPool(): Promise<PoolData> {
  const latest = await getBlock(config, { blockTag: 'latest' })
  const [slot0, liquidity] = await readContracts(config, {
    allowFailure: false,
    contracts: [
      { address: ADDR.stateView, abi: stateViewAbi, functionName: 'getSlot0', args: [POOL_ID] },
      { address: ADDR.stateView, abi: stateViewAbi, functionName: 'getLiquidity', args: [POOL_ID] },
    ],
  })
  const logs = await scanLogs(
    `pool.${POOL_ID}`,
    ADDR.poolManager,
    [[topicsFor('Initialize'), topicsFor('Swap'), topicsFor('ModifyLiquidity')], POOL_ID],
    latest.number,
  )
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
  return useQuery({ queryKey: ['trader', 'pool', POOL_ID], queryFn: loadPool, refetchInterval: 20_000, staleTime: 10_000 })
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

const TRANSFER = encodeEventTopics({ abi: positionManagerAbi, eventName: 'Transfer' })[0] as Hex

async function loadPositions(owner: Address, sqrtP: bigint): Promise<Position[]> {
  const latest = await getBlock(config, { blockTag: 'latest' })
  const logs = await scanLogs(`posm.${owner.toLowerCase()}`, ADDR.positionManager, [TRANSFER, null, pad(owner)], latest.number)
  const ids = [...new Set(logs.map((l) => BigInt(l.topics[3])))]
  if (!ids.length) return []
  const info = await readContracts(config, {
    allowFailure: true,
    contracts: ids.flatMap((id) => [
      { address: ADDR.positionManager, abi: positionManagerAbi, functionName: 'ownerOf', args: [id] } as const,
      { address: ADDR.positionManager, abi: positionManagerAbi, functionName: 'getPoolAndPositionInfo', args: [id] } as const,
      { address: ADDR.positionManager, abi: positionManagerAbi, functionName: 'getPositionLiquidity', args: [id] } as const,
    ]),
  })
  const mine: { tokenId: bigint; tickLower: number; tickUpper: number; liquidity: bigint }[] = []
  ids.forEach((tokenId, i) => {
    const [own, pos, liq] = [info[i * 3], info[i * 3 + 1], info[i * 3 + 2]]
    if (own.status !== 'success' || pos.status !== 'success' || liq.status !== 'success') return
    if (!isAddressEqual(own.result as Address, owner)) return
    const [key, packed] = pos.result as readonly [PoolKey, bigint]
    if (poolId(key) !== POOL_ID) return
    mine.push({ tokenId, ...decodePositionInfo(packed), liquidity: liq.result as bigint })
  })
  const growth = await readContracts(config, {
    allowFailure: false,
    contracts: mine.flatMap((p) => [
      {
        address: ADDR.stateView,
        abi: stateViewAbi,
        functionName: 'getPositionInfo',
        args: [POOL_ID, ADDR.positionManager, p.tickLower, p.tickUpper, pad(toHex(p.tokenId))],
      } as const,
      { address: ADDR.stateView, abi: stateViewAbi, functionName: 'getFeeGrowthInside', args: [POOL_ID, p.tickLower, p.tickUpper] } as const,
    ]),
  })
  return mine
    .map((p, i) => {
      const [, last0, last1] = growth[i * 2] as readonly [bigint, bigint, bigint]
      const [inside0, inside1] = growth[i * 2 + 1] as readonly [bigint, bigint]
      const sqrtA = getSqrtPriceAtTick(p.tickLower)
      const sqrtB = getSqrtPriceAtTick(p.tickUpper)
      const { amount0, amount1 } = amountsForLiquidity(sqrtP, sqrtA, sqrtB, p.liquidity)
      const { fee0, fee1 } = uncollectedFees(inside0, inside1, last0, last1, p.liquidity)
      return { ...p, amount0, amount1, fee0, fee1, inRange: sqrtP > sqrtA && sqrtP < sqrtB }
    })
    .sort((a, b) => (a.tokenId < b.tokenId ? 1 : -1))
}

export function usePositions(owner: Address | undefined, sqrtP: bigint | undefined) {
  return useQuery({
    queryKey: ['trader', 'positions', owner, sqrtP?.toString()],
    queryFn: () => loadPositions(owner as Address, sqrtP as bigint),
    enabled: !!owner && sqrtP !== undefined,
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  })
}

/* --- PositionManager action scripts ---------------------------------------------------------------------- */

/** v4-periphery Actions ids (src/libraries/Actions.sol). */
const A = { DECREASE_LIQUIDITY: 0x01, MINT_POSITION: 0x02, BURN_POSITION: 0x03, SETTLE_PAIR: 0x0d, TAKE_PAIR: 0x11, SWEEP: 0x14 } as const

const KEY_T = '(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)'
const pair = encodeAbiParameters(parseAbiParameters('address, address'), [POOL_KEY.currency0, POOL_KEY.currency1])

function script(actions: number[], params: Hex[]): Hex {
  return encodeAbiParameters(parseAbiParameters('bytes, bytes[]'), [concatHex(actions.map((a) => toHex(a, { size: 1 }))), params])
}

const modify = (label: string, unlockData: Hex, value?: bigint): TxStep => ({
  label,
  request: { address: ADDR.positionManager, abi: positionManagerAbi, functionName: 'modifyLiquidities', args: [unlockData, deadline()], value },
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
        (await readContract(config, { address: NEW.fremy, abi: erc20Abi, functionName: 'allowance', args: [owner, ADDR.permit2] })) >= p.amount1Max
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
          : { address: ADDR.permit2, abi: permit2Abi, functionName: 'approve', args: [NEW.fremy, ADDR.positionManager, p.amount1Max, now + 3600] }
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
