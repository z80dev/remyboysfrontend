import { isAddressEqual } from 'viem'
import { useAccount, useReadContracts } from 'wagmi'
import { reclaimAbi, remyAbi } from '../abis'
import { ADDR, RECLAIM_BATCH } from '../config'
import { useArtIndexes } from '../lib/art'
import { useTx } from '../lib/tx'
import { Badge, Group, RequireWallet, StatusBar, Thumb } from '../os/ui'

function OwnerPanel({ enabled, tx }: { enabled?: boolean; tx: ReturnType<typeof useTx> }) {
  const set = (on: boolean) =>
    tx.run([
      {
        label: on ? 'Enable claims' : 'Disable claims',
        request: { address: ADDR.remy, abi: remyAbi, functionName: 'set_minter', args: [ADDR.reclaim, on] },
      },
    ])
  return (
    <Group title="Collection owner" className="owner">
      <p className="small">
        Claims mint through the RemyReclaim contract, which needs minter rights on Remy Boys. Claims are currently{' '}
        <Badge tone={enabled ? 'ok' : 'warn'}>{enabled ? 'enabled' : 'disabled'}</Badge>
      </p>
      <div className="row">
        <button type="button" className="btn primary" disabled={tx.busy || enabled} onClick={() => set(true)}>
          Enable claims
        </button>
        <button type="button" className="btn" disabled={tx.busy || !enabled} onClick={() => set(false)}>
          Disable claims
        </button>
      </div>
    </Group>
  )
}

function RecoveryInner() {
  const { address } = useAccount()
  const tx = useTx()
  const acct = address as `0x${string}`
  const { data, isLoading } = useReadContracts({
    contracts: [
      { address: ADDR.remy, abi: remyAbi, functionName: 'owner' },
      { address: ADDR.remy, abi: remyAbi, functionName: 'is_minter', args: [ADDR.reclaim] },
      { address: ADDR.reclaim, abi: reclaimAbi, functionName: 'owed', args: [acct] },
      { address: ADDR.reclaim, abi: reclaimAbi, functionName: 'claimed', args: [acct] },
      { address: ADDR.remy, abi: remyAbi, functionName: 'isApprovedForAll', args: [acct, ADDR.paymentProcessor] },
    ],
    allowFailure: false,
  })
  const [owner, enabled, owed = [], claimedBig, approved] = data ?? []
  const { map: art } = useArtIndexes(owed)
  const isOwner = !!owner && isAddressEqual(owner, acct)
  const claimed = Number(claimedBig ?? 0n)
  const remaining = owed.length - claimed
  const batch = Math.min(remaining, RECLAIM_BATCH)

  if (isLoading || !data) return <div className="pad muted">Checking this wallet…</div>

  const claimLabel =
    remaining === 0 ? 'All claimed' : batch < remaining ? `Claim next ${batch} (${remaining} left)` : `Claim ${remaining} Remy${remaining > 1 ? 's' : ''}`
  const hint =
    remaining === 0
      ? 'Everything has been re-minted to this wallet.'
      : approved
        ? 'Claiming unlocks after step 1.'
        : !enabled
          ? 'Claims have not been enabled yet. Check back soon.'
          : batch < remaining
            ? `Claims go out ${RECLAIM_BATCH} per transaction.`
            : 'Re-mints keep the original art.'

  return (
    <>
      <div className="pad scroll">
        {isOwner && <OwnerPanel enabled={enabled} tx={tx} />}
        {owed.length === 0 ? (
          <div className="empty-state">
            <p>
              <b>This wallet has nothing to reclaim.</b>
            </p>
            <p className="muted">Only wallets that lost Remys in the Payment Processor exploit are eligible.</p>
            {approved && (
              <p>
                It still approves the Payment Processor, though —{' '}
                <button
                  type="button"
                  className="linkish"
                  disabled={tx.busy}
                  onClick={() =>
                    tx.run([{ label: 'Revoke approval', request: { address: ADDR.remy, abi: remyAbi, functionName: 'setApprovalForAll', args: [ADDR.paymentProcessor, false] } }])
                  }
                >
                  revoke it
                </button>
                .
              </p>
            )}
          </div>
        ) : (
          <>
            <Group title={`Your stolen Remys (${owed.length})`}>
              <div className="thumbs small">
                {owed.map((id, i) => (
                  <Thumb key={id.toString()} index={art.get(id)} label={i < claimed ? `#${id} ✓` : `#${id}`} dim={i < claimed} />
                ))}
              </div>
              <p className="muted small">
                {claimed} of {owed.length} re-minted. Re-mints get new token ids with the same art.
              </p>
            </Group>
            <ol className="steps">
              <li className={approved ? 'current' : 'done'}>
                <div>
                  <b>Revoke the Payment Processor approval</b>
                  <p className="muted small">The exploit abused this approval. Claims stay locked while it is active.</p>
                </div>
                <div className="step-action">
                  <Badge tone={approved ? 'warn' : 'ok'}>{approved ? 'still approved' : 'revoked ✓'}</Badge>
                  <button
                    type="button"
                    className="btn"
                    disabled={tx.busy || !approved}
                    onClick={() =>
                      tx.run([{ label: 'Revoke approval', request: { address: ADDR.remy, abi: remyAbi, functionName: 'setApprovalForAll', args: [ADDR.paymentProcessor, false] } }])
                    }
                  >
                    {approved ? 'Revoke approval' : 'Revoked'}
                  </button>
                </div>
              </li>
              <li className={!approved && remaining > 0 ? 'current' : remaining === 0 ? 'done' : ''}>
                <div>
                  <b>Claim your re-mints</b>
                  <p className="muted small">{hint}</p>
                </div>
                <div className="step-action">
                  <Badge tone={enabled ? 'ok' : 'warn'}>{enabled ? 'claims open' : 'claims closed'}</Badge>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={tx.busy || !!approved || remaining === 0 || !enabled}
                    onClick={() => tx.run([{ label: 'Claim', request: { address: ADDR.reclaim, abi: reclaimAbi, functionName: 'claim', args: [BigInt(RECLAIM_BATCH)] } }])}
                  >
                    {claimLabel}
                  </button>
                </div>
              </li>
            </ol>
          </>
        )}
      </div>
      <StatusBar status={tx.status}>RemyReclaim {ADDR.reclaim.slice(0, 10)}…</StatusBar>
    </>
  )
}

export function Recovery() {
  return (
    <div className="app-col">
      <RequireWallet why="Connect the wallet that lost Remys in the exploit to check what it can reclaim.">
        <RecoveryInner />
      </RequireWallet>
    </div>
  )
}
