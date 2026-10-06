import { useMemo } from 'react'
import type { Address } from 'viem'
import { useReadContracts } from 'wagmi'
import { reclaimAbi, remyAbi } from '../abis'
import { ADDR, RECLAIMS } from '../config'

/** One RemyReclaim contract as seen from a wallet (`owed`/`claimed` are empty without a wallet). */
export interface ReclaimWave {
  address: Address
  label: string
  /** False until the contract has code (wave addresses are known before deploy). */
  deployed: boolean
  /** Holds minter rights on Remy Boys, i.e. claims are open. */
  minting: boolean
  owed: readonly bigint[]
  claimed: number
}

export interface ReclaimState {
  waves: ReclaimWave[]
  /** Every stolen id owed to the wallet across waves, with whether it has been re-minted. */
  owed: { id: bigint; claimed: boolean }[]
  claimed: number
  remaining: number
  /** First wave still owing the wallet; claims go there. */
  next: ReclaimWave | undefined
  /** Claims are open where the wallet is owed (or, with nothing owed, on every deployed wave). */
  claimsOpen: boolean
  /** Every deployed wave holds minter rights. */
  allMinting: boolean
}

const PER_WAVE = 4

/** RemyReclaim posture of `acct` (or just the per-wave minting state without one). Undefined while loading. */
export function useReclaimState(acct?: Address, refetchInterval?: number) {
  const { data, isLoading } = useReadContracts({
    contracts: RECLAIMS.flatMap((w) => [
      { address: w.address, abi: reclaimAbi, functionName: 'remy' } as const,
      { address: ADDR.remy, abi: remyAbi, functionName: 'is_minter', args: [w.address] } as const,
      { address: w.address, abi: reclaimAbi, functionName: 'owed', args: [acct ?? ADDR.remy] } as const,
      { address: w.address, abi: reclaimAbi, functionName: 'claimed', args: [acct ?? ADDR.remy] } as const,
    ]),
    allowFailure: true,
    query: { refetchInterval },
  })

  const state = useMemo((): ReclaimState | undefined => {
    if (!data) return undefined
    const waves: ReclaimWave[] = []
    for (const [i, w] of RECLAIMS.entries()) {
      const [code, minter, owed, claimed] = data.slice(i * PER_WAVE, (i + 1) * PER_WAVE)
      // `remy()` is an immutable getter: it only fails when the address has no code yet.
      const deployed = code.status === 'success'
      if (minter.status !== 'success' || (deployed && (owed.status !== 'success' || claimed.status !== 'success'))) return undefined
      waves.push({
        address: w.address,
        label: w.label,
        deployed,
        minting: minter.result as boolean,
        owed: acct && deployed ? (owed.result as readonly bigint[]) : [],
        claimed: acct && deployed ? Number(claimed.result as bigint) : 0,
      })
    }
    const owed = waves.flatMap((w) => w.owed.map((id, j) => ({ id, claimed: j < w.claimed })))
    const claimed = waves.reduce((s, w) => s + w.claimed, 0)
    const next = waves.find((w) => w.claimed < w.owed.length)
    const live = waves.filter((w) => w.deployed)
    const allMinting = live.length > 0 && live.every((w) => w.minting)
    return { waves, owed, claimed, remaining: owed.length - claimed, next, claimsOpen: next ? next.minting : allMinting, allMinting }
  }, [acct, data])

  return { data: state, isLoading }
}
