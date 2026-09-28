import { useState } from 'react'
import { type Address, getAddress, isAddress } from 'viem'
import { useAccount, useReadContracts } from 'wagmi'
import { remyAbi } from '../abis'
import { ADDR, EXPLORER, NEW } from '../config'
import { shortAddr } from '../lib/format'
import { Icon } from '../os/icons'
import { useIsMobile } from '../os/shell'
import { useTxUi } from '../os/system'
import { AppHeader, Banner, Group, Loading, RequireWallet, StatusBar } from '../os/ui'

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
  const mobile = useIsMobile()
  const acct = address as Address
  const tx = useTxUi()
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
  const ppOn = data?.[0]?.status === 'success' && data[0].result === true

  return (
    <>
      <div className="scroll grow pad">
        {isLoading ? (
          <Loading>Checking approvals…</Loading>
        ) : active === 0 ? (
          <Banner tone="ok" icon="shieldOk" title="No contract can move your Remys">
            None of the operators below holds a blanket approval over this wallet.
          </Banner>
        ) : (
          <Banner
            tone={ppOn ? 'bad' : 'warn'}
            icon={ppOn ? 'shieldBad' : 'shieldWarn'}
            title={ppOn ? 'Your Remys are at risk' : `${active} contract${active === 1 ? ' has' : 's have'} full access`}
          >
            {active} operator{active === 1 ? ' is' : 's are'} approved with <code>setApprovalForAll</code> and can move <b>every</b> Remy in this wallet. Keep
            only the ones you actively use.
          </Banner>
        )}
        <table className="listview">
          <caption className="sr-only">Operators that can move Remys from this wallet</caption>
          {!mobile && (
            <thead>
              <tr className="lv-head">
                <th scope="col">Operator</th>
                <th scope="col">Address</th>
                <th scope="col">Access</th>
                <th scope="col">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
          )}
          <tbody>
            {ops.map((op, i) => {
              const r = data?.[i]
              const on = r?.status === 'success' ? (r.result as boolean) : undefined
              return (
                <tr key={op.address} className={`lv-row${on ? ' on' : ''}`}>
                  <td className="lv-name">
                    <Icon name={on === undefined ? 'approvals' : on ? 'shieldBad' : 'shieldOk'} size={24} />
                    <span>
                      <b>{op.label}</b>
                      <small>{op.note}</small>
                    </span>
                  </td>
                  <td className="mono small lv-addr">
                    <a href={`${EXPLORER}/address/${op.address}`} target="_blank" rel="noreferrer" title={op.address}>
                      {shortAddr(op.address)}
                    </a>
                  </td>
                  <td className={`lv-state ${on === undefined ? '' : on ? 'bad' : 'ok'}`}>{on === undefined ? '…' : on ? 'Full access' : 'No access'}</td>
                  <td className="lv-act">
                    <button type="button" className="btn" disabled={!on || tx.busy} onClick={() => revoke(op)} aria-label={`Revoke ${op.label}`}>
                      Revoke
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <Group title="Check another operator">
          <div className="row">
            <label className="sr-only" htmlFor="op-custom">
              Operator address
            </label>
            <input
              id="op-custom"
              className="input grow mono"
              placeholder="0x…"
              value={custom}
              onChange={(e) => setCustom(e.target.value.trim())}
              onKeyDown={(e) => e.key === 'Enter' && addCustom()}
            />
            <button type="button" className="btn" onClick={addCustom}>
              Check
            </button>
          </div>
        </Group>
      </div>
      <StatusBar status={tx.status} busy={tx.busy} right={isLoading ? undefined : `${ops.length} operators`} />
    </>
  )
}

export function Approvals() {
  const { address } = useAccount()
  return (
    <div className="app-col">
      <AppHeader icon="approvals" title="Approvals Manager" sub="Choose which contracts may move your Remys" />
      <RequireWallet why="Connect a wallet to see which contracts can move its Remys.">
        <ApprovalsInner key={address} />
      </RequireWallet>
    </div>
  )
}
