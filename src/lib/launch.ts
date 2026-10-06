import { type Address, isAddressEqual } from 'viem'
import { useReadContract } from 'wagmi'
import { erc20Abi, legacyVaultAbi } from '../abis'
import { ADDR, NEW, TEAM } from '../config'
import { useDataSnapshot } from './data'
import type { PoolKey } from './pool'
import { type ReclaimWave, useReclaimState } from './reclaim'
import { ethPriceAtSqrt } from './v4math'

/** fREMY/ETH pool status; `spot` is ETH per fREMY. */
export interface PoolState {
  key: PoolKey | undefined
  spot: number | undefined
  live: boolean
  loading: boolean
}

/** Whether the converter owns the legacy vault; undefined while loading. */
export interface LegacyHandover {
  handedOver: boolean | undefined
  owner: Address | undefined
  loading: boolean
}

/** Every launch-checklist input: shared by Launch Control and the team sign-in prompt. */
export interface LaunchState {
  legacy: LegacyHandover
  pool: PoolState
  /** Every deployed RemyReclaim wave holds minter rights; undefined while loading. */
  claimsEnabled: boolean | undefined
  /** Deployed waves still waiting for minter rights (the owner signs one set_minter each). */
  closedWaves: ReclaimWave[]
  ownerRb: bigint | undefined
}

/**
 * fREMY/ETH pool status. `live` means initialized AND able to fill a 1 fREMY buy; the seeded range sits just
 * below the start tick, so in-range liquidity alone is not a usable signal.
 */
export function usePoolState(): PoolState {
  const { data, isLoading } = useDataSnapshot()
  return {
    key: data?.pool.key,
    spot: data ? ethPriceAtSqrt(BigInt(data.pool.slot0[0])) : undefined,
    live: !!data && data.pool.buyOneQuote !== null,
    loading: isLoading,
  }
}

/** The legacy vault redeems only once the converter owns it (MigratorRouter.transfer_vault_ownership). */
export function useLegacyHandedOver(): LegacyHandover {
  const { data: owner, isLoading } = useReadContract({
    address: ADDR.legacyVault,
    abi: legacyVaultAbi,
    functionName: 'owner',
    query: { refetchInterval: 30_000 },
  })
  return { handedOver: owner ? isAddressEqual(owner, NEW.converter) : undefined, owner, loading: isLoading }
}

export function useLaunchState(): LaunchState {
  const legacy = useLegacyHandedOver()
  const pool = usePoolState()
  const reclaim = useReclaimState(undefined, 30_000)
  const { data: ownerRb } = useReadContract({
    address: ADDR.rbRemy,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [TEAM.owner],
    query: { refetchInterval: 30_000 },
  })
  const closedWaves = reclaim.data?.waves.filter((w) => w.deployed && !w.minting) ?? []
  return { legacy, pool, claimsEnabled: reclaim.data?.allMinting, closedWaves, ownerRb }
}

/** Launch role of a team wallet, as shown on the log-on tile and in the launch prompt. */
export function teamRole(address?: Address): 'Collection owner' | 'Legacy vault admin' | undefined {
  if (!address) return undefined
  if (isAddressEqual(address, TEAM.owner)) return 'Collection owner'
  if (isAddressEqual(address, TEAM.migrator)) return 'Legacy vault admin'
  return undefined
}

/** The owner's rbREMY has reached the deployer (or the pool is already live); undefined while loading. */
export const seedFundsSent = (s: LaunchState): boolean | undefined =>
  s.pool.live ? true : s.ownerRb === undefined ? undefined : s.ownerRb === 0n

/** Launch steps `address` still has to sign, in checklist order; undefined while any input is loading. */
export function pendingSignatures(address: Address, s: LaunchState): string[] | undefined {
  const out: string[] = []
  if (isAddressEqual(address, TEAM.migrator)) {
    if (s.legacy.handedOver === undefined) return undefined
    if (!s.legacy.handedOver) out.push('Hand the legacy vault to the converter')
  }
  if (isAddressEqual(address, TEAM.owner)) {
    const sent = seedFundsSent(s)
    if (s.claimsEnabled === undefined || sent === undefined) return undefined
    if (!s.claimsEnabled) out.push('Enable claims')
    if (!sent) out.push('Send rbREMY to the deployer')
  }
  return out
}
