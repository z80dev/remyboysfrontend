import { type Address, encodeAbiParameters, keccak256 } from 'viem'
import { useReadContract } from 'wagmi'
import { quoterAbi, routerAbi, stateViewAbi } from '../abis'
import { ADDR } from '../config'

export type PoolKey = { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks: Address }

export function poolId(key: PoolKey) {
  return keccak256(
    encodeAbiParameters(
      [{ type: 'address' }, { type: 'address' }, { type: 'uint24' }, { type: 'int24' }, { type: 'address' }],
      [key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks],
    ),
  )
}

export function usePoolKey(router?: Address) {
  return useReadContract({ address: router, abi: routerAbi, functionName: 'poolKey', query: { enabled: !!router, staleTime: Number.POSITIVE_INFINITY } }).data as
    | PoolKey
    | undefined
}

/** Spot price in ETH per fREMY. currency0 is native ETH, so slot0 price = fREMY per ETH. */
export function useSpotPrice(key?: PoolKey) {
  const { data } = useReadContract({
    address: ADDR.stateView,
    abi: stateViewAbi,
    functionName: 'getSlot0',
    args: key ? [poolId(key)] : undefined,
    query: { enabled: !!key, refetchInterval: 30_000 },
  })
  const sqrt = data?.[0]
  if (!sqrt) return undefined
  const s = Number(sqrt) / 2 ** 96
  return 1 / (s * s)
}

/** ETH → exact fREMY out (buy) or exact fREMY in → ETH (sell). */
export function useQuote(key: PoolKey | undefined, side: 'buy' | 'sell', amount: bigint) {
  const buy = side === 'buy'
  return useReadContract({
    address: ADDR.v4Quoter,
    abi: quoterAbi,
    functionName: buy ? 'quoteExactOutputSingle' : 'quoteExactInputSingle',
    args: key ? [{ poolKey: key, zeroForOne: buy, exactAmount: amount, hookData: '0x' }] : undefined,
    query: { enabled: !!key && amount > 0n, refetchInterval: 20_000, retry: false },
  })
}
