import { isAddressEqual } from 'viem'
import { useReadContract, useReadContracts } from 'wagmi'
import { erc20Abi, legacyVaultAbi, remyAbi } from '../abis'
import { ADDR, NEW, TEAM } from '../config'
import { usePoolKey, useQuote, useSpotPrice } from './pool'

const ONE = 10n ** 18n

/**
 * fREMY/ETH pool status. `live` means initialized AND able to fill a 1 fREMY buy; the seeded range sits just
 * below the start tick, so in-range liquidity alone is not a usable signal.
 */
export function usePoolState() {
  const key = usePoolKey(NEW.router)
  const spot = useSpotPrice(key)
  const quote = useQuote(spot !== undefined ? key : undefined, 'buy', ONE)
  return { key, spot, live: spot !== undefined && quote.data !== undefined, loading: key === undefined || (spot !== undefined && quote.isLoading) }
}

/** The legacy vault redeems only once the converter owns it (MigratorRouter.transfer_vault_ownership). */
export function useLegacyHandedOver() {
  const { data: owner, isLoading } = useReadContract({
    address: ADDR.legacyVault,
    abi: legacyVaultAbi,
    functionName: 'owner',
    query: { refetchInterval: 30_000 },
  })
  return { handedOver: owner ? isAddressEqual(owner, NEW.converter) : undefined, owner, loading: isLoading }
}

/** Every launch-checklist input in one place (Launch Control). */
export function useLaunchState() {
  const legacy = useLegacyHandedOver()
  const pool = usePoolState()
  const { data } = useReadContracts({
    contracts: [
      { address: ADDR.remy, abi: remyAbi, functionName: 'is_minter', args: [ADDR.reclaim] },
      { address: ADDR.rbRemy, abi: erc20Abi, functionName: 'balanceOf', args: [TEAM.owner] },
    ],
    allowFailure: true,
    query: { refetchInterval: 30_000 },
  })
  const claimsEnabled = data?.[0]?.status === 'success' ? (data[0].result as boolean) : undefined
  const ownerRb = data?.[1]?.status === 'success' ? (data[1].result as bigint) : undefined
  return { legacy, pool, claimsEnabled, ownerRb }
}
