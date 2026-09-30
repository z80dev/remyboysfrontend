import { useQuery } from '@tanstack/react-query'
import { useReadContracts } from 'wagmi'
import { remyAbi } from '../abis'
import { ADDR, IPFS_GATEWAY } from '../config'

/** The art index is the last path segment of tokenURI (re-mints keep the ORIGINAL art index). */
export function artIndexFromUri(uri: string | undefined): number | undefined {
  if (!uri) return undefined
  const last = uri.split('/').filter(Boolean).pop()
  const n = last === undefined ? Number.NaN : Number.parseInt(last, 10)
  return Number.isFinite(n) ? n : undefined
}

export const ipfsToHttp = (uri: string) => (uri.startsWith('ipfs://') ? IPFS_GATEWAY + uri.slice(7) : uri)

/** tokenURI → art index for many ids in one multicall. */
export function useArtIndexes(ids: readonly bigint[]) {
  const { data, isLoading } = useReadContracts({
    contracts: ids.map((id) => ({ address: ADDR.remy, abi: remyAbi, functionName: 'tokenURI', args: [id] }) as const),
    allowFailure: true,
    query: { enabled: ids.length > 0, staleTime: Number.POSITIVE_INFINITY },
  })
  const map = new Map<bigint, number | undefined>()
  ids.forEach((id, i) => {
    const r = data?.[i]
    map.set(id, r?.status === 'success' ? artIndexFromUri(r.result as string) : undefined)
  })
  return { map, uris: data, isLoading }
}

export type Metadata = {
  name?: string
  image?: string
  attributes?: { trait_type: string; value: string | number }[]
}

export function useMetadata(uri: string | undefined) {
  return useQuery({
    queryKey: ['metadata', uri],
    enabled: !!uri,
    staleTime: Number.POSITIVE_INFINITY,
    retry: 1,
    queryFn: async (): Promise<Metadata> => {
      const res = await fetch(ipfsToHttp(uri as string))
      if (!res.ok) throw new Error(`metadata ${res.status}`)
      return res.json()
    },
  })
}
