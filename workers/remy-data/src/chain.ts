import {
  http,
  type Address,
  ContractFunctionRevertedError,
  type Hex,
  createPublicClient,
  decodeEventLog,
  encodeAbiParameters,
  encodeEventTopics,
  keccak256,
  pad,
  toHex,
} from 'viem'
import { base } from 'viem/chains'
import { erc20Abi, poolEventsAbi, positionManagerAbi, quoterAbi, remyAbi, stateViewAbi, vaultAbi } from '../../../src/abis'
import type { CachedPosition, DataSnapshot, MarketLog } from '../../../src/lib/data-schema'
import { amountsForLiquidity, ethPriceAtSqrt, getSqrtPriceAtTick, uncollectedFees } from '../../../src/lib/v4math'

// Production identity only; a fork needs its own data-service deployment.
export const A = {
  remy: '0x3e9e529E32aD2821BDBFDA348C2F9dA94b43976c',
  fremy: '0x66e66f9772c9ea0B38B7Cd52820Af42CCbb31721',
  vault: '0xd91368768eA898c9BC09d85b13C0924B59405D1C',
  stateView: '0xA3c0c9b65baD0b08107Aa264b0f3dB444b867A71',
  poolManager: '0x498581fF718922c3f8e6A244956aF099B2652b2b',
  quoter: '0x0d5e0F971ED27FBfF6c2837bf31316121532048D',
  positionManager: '0x7C5f5A4bBd8fD63184577525326123B519429bDc',
} as const satisfies Record<string, Address>
export const KEY = {
  currency0: '0x0000000000000000000000000000000000000000',
  currency1: A.fremy,
  fee: 10_000,
  tickSpacing: 200,
  hooks: '0x0000000000000000000000000000000000000000',
} as const
export const START = 51884322n
export const POOL = keccak256(
  encodeAbiParameters(
    [{ type: 'address' }, { type: 'address' }, { type: 'uint24' }, { type: 'int24' }, { type: 'address' }],
    ['0x0000000000000000000000000000000000000000', A.fremy, 10_000, 200, '0x0000000000000000000000000000000000000000'],
  ),
)
export const clientFor = (key: string) =>
  createPublicClient({
    chain: base,
    transport: http(`https://base-mainnet.g.alchemy.com/v2/${key}`, { retryCount: 1, timeout: 15_000 }),
  })
export const EVENT_TOPICS = ['Initialize', 'Swap', 'ModifyLiquidity'].map(
  (eventName) => encodeEventTopics({ abi: poolEventsAbi, eventName: eventName as 'Initialize' | 'Swap' | 'ModifyLiquidity' })[0] as Hex,
)
type Client = ReturnType<typeof clientFor>

/** Full range is supported by the account's Alchemy plan; never split into tiny browser loops. */
export async function loadLogs(client: Client, from: bigint, to: bigint): Promise<MarketLog[]> {
  const logs = await client.request({
    method: 'eth_getLogs',
    params: [{ address: A.poolManager, topics: [EVENT_TOPICS, POOL], fromBlock: toHex(from), toBlock: toHex(to) }],
  })
  return logs.map((l) => {
    if (l.blockNumber === null || l.transactionHash === null || l.logIndex === null) throw new Error('Provider returned an unmined event')
    return { blockNumber: BigInt(l.blockNumber).toString(), logIndex: Number(l.logIndex), transactionHash: l.transactionHash, topics: l.topics as Hex[], data: l.data }
  })
}

/** Replaces an overlap on every refresh, dropping orphaned events after a shallow reorg. */
export function mergeLogs(old: MarketLog[], next: MarketLog[], from: bigint, to: bigint): MarketLog[] {
  const logs = new Map<string, MarketLog>()
  for (const l of [...old.filter((l) => BigInt(l.blockNumber) < from && BigInt(l.blockNumber) <= to), ...next])
    logs.set(`${l.transactionHash}:${l.logIndex}`, l)
  return [...logs.values()].sort((a, b) => Number(BigInt(a.blockNumber) - BigInt(b.blockNumber)) || a.logIndex - b.logIndex)
}

export function positionRanges(logs: MarketLog[]) {
  const positions = new Map<string, { tickLower: number; tickUpper: number; liquidity: bigint }>()
  for (const l of logs) {
    const ev = decodeEventLog({ abi: poolEventsAbi, topics: l.topics as [Hex, ...Hex[]], data: l.data })
    if (ev.eventName !== 'ModifyLiquidity' || ev.args.sender.toLowerCase() !== A.positionManager.toLowerCase()) continue
    const id = BigInt(ev.args.salt).toString()
    const prev = positions.get(id)
    positions.set(id, {
      tickLower: ev.args.tickLower,
      tickUpper: ev.args.tickUpper,
      liquidity: (prev?.liquidity ?? 0n) + ev.args.liquidityDelta,
    })
  }
  return [...positions.entries()].filter(([, p]) => p.liquidity > 0n)
}

export async function buildSnapshot(client: Client, block: { number: bigint; timestamp: bigint }, logs: MarketLog[]): Promise<DataSnapshot> {
  const [slot0, liquidity, collectionSupply, inventory, maxBatch, fremySupply, fremyInVault] = await client.multicall({
    blockNumber: block.number,
    allowFailure: false,
    batchSize: 16_384,
    contracts: [
      { address: A.stateView, abi: stateViewAbi, functionName: 'getSlot0', args: [POOL] },
      { address: A.stateView, abi: stateViewAbi, functionName: 'getLiquidity', args: [POOL] },
      { address: A.remy, abi: remyAbi, functionName: 'totalSupply' },
      { address: A.vault, abi: vaultAbi, functionName: 'inventoryCount' },
      { address: A.vault, abi: vaultAbi, functionName: 'maxBatch' },
      { address: A.fremy, abi: erc20Abi, functionName: 'totalSupply' },
      { address: A.fremy, abi: erc20Abi, functionName: 'balanceOf', args: [A.vault] },
    ],
  })
  if (!Number.isFinite(ethPriceAtSqrt(slot0[0]))) throw new Error('Pool is not initialized')
  let buyOneQuote: string | null = null
  try {
    const quote = await client.readContract({
      address: A.quoter,
      abi: quoterAbi,
      functionName: 'quoteExactOutputSingle',
      args: [{ poolKey: KEY, zeroForOne: true, exactAmount: 10n ** 18n, hookData: '0x' }],
      blockNumber: block.number,
    })
    buyOneQuote = quote[0].toString()
  } catch (error) {
    // An unfillable pool is a valid state; provider/transport failures must preserve the old snapshot.
    if (
      !(error instanceof Error) ||
      !('walk' in error) ||
      typeof error.walk !== 'function' ||
      !error.walk((e: Error) => e instanceof ContractFunctionRevertedError)
    )
      throw error
  }
  const ranges = positionRanges(logs)
  const ownersAndFees = ranges.length
    ? await client.multicall({
        blockNumber: block.number,
        allowFailure: false,
        batchSize: 16_384,
        contracts: ranges.flatMap(([id, p]) => [
          { address: A.positionManager, abi: positionManagerAbi, functionName: 'ownerOf', args: [BigInt(id)] } as const,
          {
            address: A.stateView,
            abi: stateViewAbi,
            functionName: 'getPositionInfo',
            args: [POOL, A.positionManager, p.tickLower, p.tickUpper, pad(toHex(BigInt(id)))],
          } as const,
          {
            address: A.stateView,
            abi: stateViewAbi,
            functionName: 'getFeeGrowthInside',
            args: [POOL, p.tickLower, p.tickUpper],
          } as const,
        ]),
      })
    : []
  const positions: CachedPosition[] = ranges.map(([tokenId, p], i) => {
    const owner = ownersAndFees[i * 3] as Address
    const [liq, last0, last1] = ownersAndFees[i * 3 + 1] as readonly [bigint, bigint, bigint]
    const [inside0, inside1] = ownersAndFees[i * 3 + 2] as readonly [bigint, bigint]
    const lower = getSqrtPriceAtTick(p.tickLower)
    const upper = getSqrtPriceAtTick(p.tickUpper)
    const amounts = amountsForLiquidity(slot0[0], lower, upper, liq)
    const fees = uncollectedFees(inside0, inside1, last0, last1, liq)
    return {
      tokenId,
      owner,
      tickLower: p.tickLower,
      tickUpper: p.tickUpper,
      liquidity: liq.toString(),
      amount0: amounts.amount0.toString(),
      amount1: amounts.amount1.toString(),
      fee0: fees.fee0.toString(),
      fee1: fees.fee1.toString(),
      inRange: slot0[0] > lower && slot0[0] < upper,
    }
  })
  return {
    version: 1,
    chainId: 8453,
    poolId: POOL,
    generatedAt: new Date().toISOString(),
    block: { number: block.number.toString(), timestamp: block.timestamp.toString() },
    stats: {
      collectionSupply: collectionSupply.toString(),
      inventory: inventory.toString(),
      maxBatch: maxBatch.toString(),
      fremySupply: fremySupply.toString(),
      fremyInVault: fremyInVault.toString(),
    },
    pool: {
      key: KEY,
      buyOneQuote,
      slot0: [slot0[0].toString(), slot0[1], slot0[2], slot0[3]],
      liquidity: liquidity.toString(),
    },
    logs,
    positions,
  }
}
