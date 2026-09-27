import type { Address } from 'viem'
import { useReadContract, useReadContracts } from 'wagmi'
import { remyAbi } from '../abis'
import { ADDR } from '../config'

/** Token ids held by `owner` (ERC721Enumerable), one page at a time. */
export function useOwnedIds(owner: Address | undefined, page = 0, pageSize = 60) {
  const { data: balance } = useReadContract({
    address: ADDR.remy,
    abi: remyAbi,
    functionName: 'balanceOf',
    args: owner ? [owner] : undefined,
    query: { enabled: !!owner },
  })
  const total = Number(balance ?? 0n)
  const start = page * pageSize
  const count = Math.max(0, Math.min(pageSize, total - start))
  const { data, isLoading } = useReadContracts({
    contracts: Array.from(
      { length: count },
      (_, i) => ({ address: ADDR.remy, abi: remyAbi, functionName: 'tokenOfOwnerByIndex', args: [owner as Address, BigInt(start + i)] }) as const,
    ),
    allowFailure: false,
    query: { enabled: !!owner && count > 0 },
  })
  return { ids: (data ?? []) as bigint[], total, pages: Math.max(1, Math.ceil(total / pageSize)), loading: balance === undefined || (count > 0 && isLoading) }
}
