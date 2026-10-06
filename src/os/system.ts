import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { Address } from 'viem'
import { useAccount, useReadContract } from 'wagmi'
import { remyAbi } from '../abis'
import { ADDR } from '../config'
import { useArtIndexes } from '../lib/art'
import { shortAddr } from '../lib/format'
import { pendingSignatures, teamRole, useLaunchState } from '../lib/launch'
import { useOwnedIds } from '../lib/owned'
import { useReclaimState } from '../lib/reclaim'
import { type TxStatus, type TxStep, useTx } from '../lib/tx'
import { chain } from '../wagmi'
import { balloon, messageBox } from './shell'

/** Art index of the first Remy the wallet holds (for the Start menu / login user tile). */
export function useWalletRemy(address?: Address) {
  const { ids, total } = useOwnedIds(address, 0, 1)
  const { map } = useArtIndexes(ids)
  return { art: ids[0] !== undefined ? map.get(ids[0]) : undefined, id: ids[0], count: total }
}

/** Recovery + approval posture of the connected wallet. Drives tray balloons and the mobile Today screen. */
export function useSecurityState() {
  const { address } = useAccount()
  const acct = address as Address
  const reclaim = useReclaimState(address ? acct : undefined, 60_000)
  const { data: ppApproved } = useReadContract({
    address: ADDR.remy,
    abi: remyAbi,
    functionName: 'isApprovedForAll',
    args: [acct, ADDR.paymentProcessor],
    query: { enabled: !!address, refetchInterval: 60_000 },
  })
  const r = reclaim.data
  return useMemo(() => {
    if (!address || !r) return undefined
    return { address, owed: r.owed.length, claimed: r.claimed, remaining: r.remaining, claimsOpen: r.claimsOpen, ppApproved: !!ppApproved }
  }, [address, r, ppApproved])
}

/** Posts the real-state balloons from the notification area. */
export function useSecurityBalloons(enabled: boolean) {
  const s = useSecurityState()
  const { chainId, address } = useAccount()
  useEffect(() => {
    if (!s || !enabled) return
    const tag = s.address.slice(2, 10)
    if (s.remaining > 0 && s.claimsOpen)
      balloon({
        key: `reclaim-open-${tag}-${s.remaining}`,
        icon: 'shieldWarn',
        app: 'recovery',
        title: `You have ${s.remaining} Remy${s.remaining === 1 ? '' : 's'} to reclaim`,
        text: s.ppApproved
          ? 'Claims are open. Revoke the Payment Processor approval, then claim your re-mints.'
          : 'Claims are open. Click here to claim your re-mints.',
      })
    else if (s.remaining > 0)
      balloon({
        key: `reclaim-wait-${tag}`,
        icon: 'recovery',
        app: 'recovery',
        title: `${s.remaining} Remy${s.remaining === 1 ? ' is' : 's are'} waiting for you`,
        text: 'Claims are not open yet. You can already revoke the Payment Processor approval in the Recovery Center.',
      })
    else if (s.ppApproved)
      balloon({
        key: `pp-risk-${tag}`,
        icon: 'shieldBad',
        app: 'approvals',
        title: 'Your Remys are at risk',
        text: 'Payment Processor v2 can still move every Remy in this wallet. Click here to review approvals.',
      })
  }, [s, enabled])
  useEffect(() => {
    if (enabled && address && chainId !== undefined && chainId !== chain.id)
      balloon({
        key: `chain-${chainId}`,
        icon: 'warning',
        title: 'Wrong network',
        text: 'Your wallet is not on Base. Remy OS will ask to switch before any transaction.',
      })
  }, [address, chainId, enabled])
}

/**
 * Asks a team wallet, right after it connects, to open Launch Control when steps are waiting on its signature.
 * Once per wallet per session. Mount only for team wallets so other visitors skip the launch reads.
 */
export function TeamPrompt({ navigate }: { navigate: (hash: string) => void }) {
  const { address } = useAccount()
  const launch = useLaunchState()
  const summary = address ? pendingSignatures(address, launch)?.join('\n') : undefined
  useEffect(() => {
    if (!address || !summary) return
    const key = `remyxp.teamPrompt.${address}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    const steps = summary.split('\n')
    const role = teamRole(address)?.toLowerCase() ?? 'a team wallet'
    const need = steps.length === 1 ? 'One launch step needs' : `${steps.length} launch steps need`
    messageBox({
      title: 'Launch Control',
      icon: 'question',
      text: `Signed in as the ${role} (${shortAddr(address)}). ${need} your signature: ${steps.join('; ')}. Open Launch Control now?`,
      onConfirm: () => navigate('launch'),
    })
  }, [address, summary, navigate])
  return null
}

/**
 * useTx with the shell attached: a "Transaction confirmed" balloon after success and an XP message box
 * for real failures (wallet rejections stay in the status bar).
 */
export type TxUi = { run: (steps: TxStep[]) => Promise<boolean>; busy: boolean; status: TxStatus; setStatus: (s: TxStatus) => void }

export function useTxUi(): TxUi {
  const tx = useTx()
  const lastError = useRef('')
  useEffect(() => {
    const { msg, error } = tx.status
    if (!error || msg === lastError.current) return
    lastError.current = msg
    if (msg !== 'Request rejected in wallet.' && msg !== 'That is not a valid address.') messageBox({ title: 'Transaction failed', text: msg, icon: 'error' })
  }, [tx.status])
  const { run } = tx
  const runUi = useCallback(
    async (steps: TxStep[]) => {
      lastError.current = ''
      const ok = await run(steps)
      if (ok)
        balloon(
          {
            key: `tx-${Date.now()}`,
            icon: 'shieldOk',
            title: 'Transaction confirmed',
            text: `${steps[steps.length - 1]?.label ?? 'Transaction'} went through.`,
          },
          true,
        )
      return ok
    },
    [run],
  )
  return { ...tx, run: runUi }
}
