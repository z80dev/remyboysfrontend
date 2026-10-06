import { useQuery } from '@tanstack/react-query'
import { DATA_API } from '../config'
import type { DataSnapshot } from './data-schema'

/** One query/cache entry shared by every public display, including market and LP positions. */
export function useDataSnapshot(poll = false) {
  return useQuery({
    queryKey: ['data', DATA_API],
    queryFn: async (): Promise<DataSnapshot> => {
      const res = await fetch(`${DATA_API}/snapshot`)
      if (!res.ok) throw new Error(`Remy data service unavailable (${res.status}). Please try again shortly.`)
      const data: DataSnapshot = await res.json()
      if (data.version !== 1 || data.chainId !== 8453 || !data.block || !data.stats || !data.pool || !Array.isArray(data.logs))
        throw new Error('Remy data service returned an invalid snapshot.')
      if (!Number.isFinite(Date.parse(data.generatedAt)) || Date.now() - Date.parse(data.generatedAt) > 120_000)
        throw new Error('Remy data is out of date. Please try again shortly.')
      return data
    },
    staleTime: 30_000,
    refetchInterval: poll ? 30_000 : false,
    retry: 1,
  })
}

/** Only one observer owns the timer; opening more windows never adds polling loops. */
export function DataRefresh() {
  useDataSnapshot(true)
  return null
}
