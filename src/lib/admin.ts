import { useQuery } from '@tanstack/react-query'
import { ADMIN_API } from '../config'

/* Response of `GET <ADMIN_API>/api/admin/snapshot` (Remy admin indexer). Wide numbers are decimal wei strings. */

export type LegacyKey = 'rbREMYLS' | 'rbREMY' | 'wREMY' | 'REMY'

export type Snapshot = {
  generatedAt: string
  block: number
  complete: Record<string, { supply: string; verifiedSum: string; complete: boolean }>
  labels: Record<string, string>
  stuck: {
    totalRemys: number
    contracts: {
      key: string
      name: string
      address: string
      remys: number
      claimToken?: { key: string; symbol: string; address: string; supply: string; remysPerToken: number }
    }[]
  }
  legacy: {
    key: LegacyKey
    symbol: string
    address: string
    decimals: 18
    supply: string
    remysPerToken: number
    holders: { address: string; balance: string; remys: number; isContract: boolean; lockedUntil?: number; label?: string }[]
  }[]
  collection: {
    totalSupply: number
    holderCount: number
    top: { address: string; nfts: number; isContract: boolean; label?: string }[]
  }
  vault: {
    inventory: number
    reserve: string
    fremySupply: string
    fremyOutsideVault: string
    price: number
    fremyHolders: { address: string; balance: string; label?: string }[]
    lp: {
      tokenId: string
      owner: string
      tickLower: number
      tickUpper: number
      liquidity: string
      fremy: string
      eth: string
      inRange: boolean
      label?: string
    }[]
  }
  recovery: {
    claimsEnabled: boolean
    victims: { address: string; owed: number; claimed: number }[]
    stolenStillWithAttacker: number
    stolenTotal: number
  }
  whales: {
    address: string
    nfts: number
    legacyRemys: number
    fremy: number
    lpRemys: number
    total: number
    isContract: boolean
    label?: string
    ens?: string
  }[]
}

async function loadSnapshot(): Promise<Snapshot> {
  const res = await fetch(`${ADMIN_API}/api/admin/snapshot`, { headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`The index answered ${res.status} ${res.statusText || ''}`.trim())
  return res.json()
}

export function useSnapshot() {
  return useQuery({ queryKey: ['admin', 'snapshot', ADMIN_API], queryFn: loadSnapshot, staleTime: 60_000, refetchInterval: 5 * 60_000, retry: 1 })
}
