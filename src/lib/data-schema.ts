import type { Address, Hex } from 'viem'

export type MarketLog = { blockNumber: string; logIndex: number; transactionHash: Hex; topics: Hex[]; data: Hex }
export type CachedPosition = {
  tokenId: string
  owner: Address
  tickLower: number
  tickUpper: number
  liquidity: string
  amount0: string
  amount1: string
  fee0: string
  fee1: string
  inRange: boolean
}
export type DataSnapshot = {
  version: 1
  chainId: 8453
  poolId: Hex
  generatedAt: string
  block: { number: string; timestamp: string }
  stats: { collectionSupply: string; inventory: string; maxBatch: string; fremySupply: string; fremyInVault: string }
  pool: {
    key: { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks: Address }
    buyOneQuote: string | null
    slot0: readonly [string, number, number, number]
    liquidity: string
  }
  logs: MarketLog[]
  positions: CachedPosition[]
}
