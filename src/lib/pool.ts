import { useEffect, useState } from 'react'
import { type Address, encodeAbiParameters, keccak256 } from 'viem'
import { useReadContract } from 'wagmi'
import { quoterAbi } from '../abis'
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

/** ETH → exact fREMY out (buy) or exact fREMY in → ETH (sell). */
export function useQuote(key: PoolKey | undefined, side: 'buy' | 'sell', amount: bigint) {
  const buy = side === 'buy'
  const [settledAmount, setSettledAmount] = useState(amount)
  useEffect(() => {
    const timer = setTimeout(() => setSettledAmount(amount), 250)
    return () => clearTimeout(timer)
  }, [amount])
  const settled = amount === settledAmount
  const quote = useReadContract({
    address: ADDR.v4Quoter,
    account: '0x0000000000000000000000000000000000000000',
    abi: quoterAbi,
    functionName: buy ? 'quoteExactOutputSingle' : 'quoteExactInputSingle',
    args: key ? [{ poolKey: key, zeroForOne: buy, exactAmount: settledAmount, hookData: '0x' }] : undefined,
    query: { enabled: !!key && settled && amount > 0n, refetchInterval: settled && amount > 0n ? 20_000 : false, retry: false },
  })
  // Hide the previous amount's quote immediately so it can never authorize a changed order.
  return { ...quote, data: settled ? quote.data : undefined, isLoading: (!settled && amount > 0n) || quote.isLoading }
}
