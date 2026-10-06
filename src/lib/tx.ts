import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from 'viem'
import { useAccount, useConfig, useSwitchChain, useWriteContract } from 'wagmi'
import { waitForTransactionReceipt } from 'wagmi/actions'
import { chain } from '../wagmi'

const FRIENDLY: Record<string, string> = {
  ApprovalStillActive: 'Revoke the Payment Processor approval first.',
  NothingToClaim: 'Nothing left to claim for this wallet.',
  Blocked: 'That Remy was stolen in the exploit and cannot be deposited.',
  BatchTooLarge: 'Batch too large for one transaction.',
  InvalidOperation: 'The vault rejected this selection (already taken or not yours).',
  ReserveDeficit: 'The vault reserve cannot cover this right now.',
  EnforcedPause: 'The converter is paused.',
}

export function explainError(err: unknown): string {
  if (err instanceof BaseError) {
    if (err.walk((e) => e instanceof UserRejectedRequestError)) return 'Request rejected in wallet.'
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null
    const name = revert?.data?.errorName
    if (name && FRIENDLY[name]) return FRIENDLY[name]
    if (revert?.reason?.includes('AccessControl')) return 'Claims are not enabled yet.'
    return err.shortMessage
  }
  return err instanceof Error ? err.message : String(err)
}

// biome-ignore lint/suspicious/noExplicitAny: heterogenous contract calls funnel through one runner
export type TxRequest = { address: `0x${string}`; abi: any; functionName: string; args?: readonly unknown[]; value?: bigint }
export type TxStep = { label: string; request: TxRequest | (() => Promise<TxRequest | null>) }

export type TxStatus = { msg: string; error: boolean; hash?: `0x${string}` }

/** Sequential transaction runner with wallet/chain handling and a human status line. */
export function useTx() {
  const config = useConfig()
  const qc = useQueryClient()
  const { chainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<TxStatus>({ msg: '', error: false })

  const run = useCallback(
    async (steps: TxStep[]): Promise<boolean> => {
      setBusy(true)
      let confirmed = false
      try {
        if (chainId !== chain.id) await switchChainAsync({ chainId: chain.id })
        for (const [i, step] of steps.entries()) {
          const prefix = steps.length > 1 ? `(${i + 1}/${steps.length}) ${step.label}` : step.label
          const request = typeof step.request === 'function' ? await step.request() : step.request
          if (!request) continue
          setStatus({ msg: `${prefix}: confirm in your wallet…`, error: false })
          const hash = await writeContractAsync({ ...request, chainId: chain.id } as Parameters<typeof writeContractAsync>[0])
          setStatus({ msg: `${prefix}: waiting for confirmation…`, error: false, hash })
          const receipt = await waitForTransactionReceipt(config, { hash, chainId: chain.id })
          if (receipt.status !== 'success') throw new Error(`${step.label} reverted (${hash})`)
          confirmed = true
          setStatus({ msg: `${prefix}: done.`, error: false, hash })
        }
        return true
      } catch (err) {
        setStatus({ msg: explainError(err), error: true })
        return false
      } finally {
        setBusy(false)
        if (confirmed) await qc.invalidateQueries()
      }
    },
    [chainId, config, qc, switchChainAsync, writeContractAsync],
  )

  return { run, busy, status, setStatus }
}
