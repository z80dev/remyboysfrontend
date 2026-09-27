import { useState } from 'react'
import { type Address, getAddress, isAddress } from 'viem'
import { useAccount, useReadContracts } from 'wagmi'
import { remyAbi } from '../abis'
import { ADDR, NEW } from '../config'
import { shortAddr } from '../lib/format'
import { useTx } from '../lib/tx'
import { Badge, Group, RequireWallet, StatusBar } from '../os/ui'

type Op = { label: string; address: Address; note: string }

const KNOWN: Op[] = [
  { label: 'Payment Processor v2', address: ADDR.paymentProcessor, note: 'Abused in the exploit. Revoke.' },
  { label: 'OpenSea conduit', address: ADDR.openseaConduit, note: 'OpenSea listings' },
  { label: 'Seaport 1.6', address: ADDR.seaport16, note: 'Seaport direct' },
  { label: 'Legacy vault (rbREMY)', address: ADDR.legacyVault, note: 'Old vault, now closed' },
  { label: 'wREMY', address: ADDR.wRemy, note: 'Old wrapper' },
  ...(NEW.router ? [{ label: 'RemyRouter', address: NEW.router, note: 'Sell Remys for ETH' }] : []),
  ...(NEW.vault ? [{ label: 'Remy Vault', address: NEW.vault, note: 'Deposit Remys for fREMY' }] : []),
]

function ApprovalsInner() {
  const { address } = useAccount()
  const acct = address as Address
  const tx = useTx()
  const [custom, setCustom] = useState('')
  const [extra, setExtra] = useState<Op[]>([])
  const ops = [...KNOWN, ...extra]

  const { data, isLoading } = useReadContracts({
    contracts: ops.map((o) => ({ address: ADDR.remy, abi: remyAbi, functionName: 'isApprovedForAll', args: [acct, o.address] }) as const),
    allowFailure: true,
  })

  const revoke = (op: Op) =>
    tx.run([{ label: `Revoke ${op.label}`, request: { address: ADDR.remy, abi: remyAbi, functionName: 'setApprovalForAll', args: [op.address, false] } }])

  const addCustom = () => {
    if (!isAddress(custom)) return tx.setStatus({ msg: 'That is not a valid address.', error: true })
    const a = getAddress(custom)
    if (!ops.some((o) => o.address === a)) setExtra((x) => [...x, { label: shortAddr(a), address: a, note: 'Custom check' }])
    setCustom('')
  }

  const active = data?.filter((r) => r.status === 'success' && r.result).length ?? 0

  return (
    <>
      <div className="pad scroll">
        <p className="muted small">
          Operators approved with <span className="mono">setApprovalForAll</span> can move <b>every</b> Remy in your wallet. Keep only the ones
          you actively use.
        </p>
        <Group title={isLoading ? 'Checking…' : `${active} active approval${active === 1 ? '' : 's'}`}>
          <table className="table">
            <tbody>
              {ops.map((op, i) => {
                const r = data?.[i]
                const on = r?.status === 'success' ? (r.result as boolean) : undefined
                return (
                  <tr key={op.address}>
                    <td>
                      <b>{op.label}</b>
                      <div className="muted small mono">{op.address}</div>
                      <div className="muted small">{op.note}</div>
                    </td>
                    <td className="nowrap">
                      {on === undefined ? <Badge>…</Badge> : on ? <Badge tone="warn">approved</Badge> : <Badge tone="ok">not approved</Badge>}
                    </td>
                    <td className="nowrap">
                      <button type="button" className="btn" disabled={!on || tx.busy} onClick={() => revoke(op)}>
                        Revoke
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Group>
        <Group title="Check another operator">
          <div className="row">
            <input className="input grow mono" placeholder="0x…" value={custom} onChange={(e) => setCustom(e.target.value.trim())} onKeyDown={(e) => e.key === 'Enter' && addCustom()} />
            <button type="button" className="btn" onClick={addCustom}>
              Check
            </button>
          </div>
        </Group>
      </div>
      <StatusBar status={tx.status} />
    </>
  )
}

export function Approvals() {
  return (
    <div className="app-col">
      <RequireWallet why="Connect a wallet to see which contracts can move its Remys.">
        <ApprovalsInner />
      </RequireWallet>
    </div>
  )
}
