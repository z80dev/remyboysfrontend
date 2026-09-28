import { isAddressEqual } from 'viem'
import { useAccount, useReadContracts } from 'wagmi'
import { reclaimAbi, remyAbi } from '../abis'
import { ADDR, EXPLORER, RECLAIM_BATCH } from '../config'
import { useArtIndexes } from '../lib/art'
import type { TxStep } from '../lib/tx'
import type { AppProps } from '../os/apps'
import { useIsMobile } from '../os/shell'
import { type TxUi, useTxUi } from '../os/system'
import { AppHeader, Banner, Loading, RequireWallet, StatusBar, StatusRow, TaskBox, TaskLink, TaskPane, Thumb } from '../os/ui'

const revokeStep: TxStep = {
  label: 'Revoke approval',
  request: { address: ADDR.remy, abi: remyAbi, functionName: 'setApprovalForAll', args: [ADDR.paymentProcessor, false] },
}

function OwnerRow({ enabled, tx }: { enabled?: boolean; tx: TxUi }) {
  const set = (on: boolean) =>
    tx.run([
      {
        label: on ? 'Enable claims' : 'Disable claims',
        request: { address: ADDR.remy, abi: remyAbi, functionName: 'set_minter', args: [ADDR.reclaim, on] },
      },
    ])
  return (
    <StatusRow tone={enabled ? 'ok' : 'warn'} icon="computer" title="Collection owner: claim minting" state={enabled ? 'ON' : 'OFF'}>
      <p>Claims mint through the RemyReclaim contract, which needs minter rights on Remy Boys. You are the collection owner.</p>
      <div className="row end">
        <button type="button" className="btn" disabled={tx.busy || !enabled} onClick={() => set(false)}>
          Disable claims
        </button>
        <button type="button" className="btn default" disabled={tx.busy || enabled} onClick={() => set(true)}>
          Enable claims
        </button>
      </div>
    </StatusRow>
  )
}

function RecoveryInner({ navigate }: { navigate: (h: string) => void }) {
  const { address } = useAccount()
  const mobile = useIsMobile()
  const tx = useTxUi()
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

  if (isLoading || !data) return <Loading>Recovery Center is checking this wallet…</Loading>

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

  const banner =
    owed.length === 0 ? (
      approved ? (
        <Banner tone="bad" icon="shieldBad" title="Your Remys are at risk">
          This wallet has nothing to reclaim, but it still approves Payment Processor v2, the contract abused in the exploit.
        </Banner>
      ) : (
        <Banner tone="ok" icon="shieldOk" title="Your Remys are protected">
          This wallet has nothing to reclaim. Only wallets that lost Remys in the Payment Processor exploit are eligible.
        </Banner>
      )
    ) : remaining === 0 ? (
      <Banner tone="ok" icon="shieldOk" title="Recovery complete">
        All {owed.length} stolen Remy{owed.length === 1 ? ' has' : 's have'} been re-minted to this wallet.
      </Banner>
    ) : approved ? (
      <Banner tone="bad" icon="shieldBad" title="Your Remys are at risk">
        Payment Processor v2 can still move every Remy in this wallet. Revoke it to unlock your {remaining} re-mint{remaining === 1 ? '' : 's'}.
      </Banner>
    ) : enabled ? (
      <Banner tone="warn" icon="shieldWarn" title={`You have ${remaining} Remy${remaining === 1 ? '' : 's'} to reclaim`}>
        Your wallet is protected and claims are open.
      </Banner>
    ) : (
      <Banner tone="info" icon="info" title={`${remaining} Remy${remaining === 1 ? ' is' : 's are'} waiting for you`}>
        Your wallet is protected. Claims have not been opened yet.
      </Banner>
    )

  return (
    <>
      <div className="split">
        {!mobile && (
          <TaskPane>
            <TaskBox title="Resources" primary>
              <TaskLink icon="approvals" onClick={() => navigate('approvals')}>
                Review all approvals
              </TaskLink>
              <TaskLink icon="gallery" onClick={() => navigate('gallery')}>
                Browse the gallery
              </TaskLink>
              <TaskLink icon="globe" href={`${EXPLORER}/address/${ADDR.reclaim}`}>
                RemyReclaim on Basescan
              </TaskLink>
            </TaskBox>
            <TaskBox title="Details">
              <dl className="kv tight">
                <dt>Stolen</dt>
                <dd>{owed.length}</dd>
                <dt>Re-minted</dt>
                <dd>{claimed}</dd>
                <dt>Claims</dt>
                <dd>{enabled ? 'open' : 'closed'}</dd>
              </dl>
            </TaskBox>
          </TaskPane>
        )}
        <main className="split-main scroll">
          {banner}
          {isOwner && <OwnerRow enabled={enabled} tx={tx} />}
          {owed.length === 0 ? (
            approved && (
              <StatusRow tone="bad" icon="shieldBad" title="Payment Processor approval" state="AT RISK">
                <p>Revoke it so the exploited contract can never move your Remys.</p>
                <div className="row end">
                  <button type="button" className="btn default" disabled={tx.busy} onClick={() => tx.run([revokeStep])}>
                    Revoke approval
                  </button>
                </div>
              </StatusRow>
            )
          ) : (
            <>
              <h2 className="section-h">Recovery essentials</h2>
              <StatusRow
                tone={approved ? 'bad' : 'ok'}
                icon={approved ? 'shieldBad' : 'shieldOk'}
                title="1. Payment Processor approval"
                state={approved ? 'AT RISK' : 'REVOKED'}
                defaultOpen={!!approved}
              >
                <p>The exploit abused this approval. Claims stay locked while it is active.</p>
                <div className="row end">
                  <button type="button" className="btn default" disabled={tx.busy || !approved} onClick={() => tx.run([revokeStep])}>
                    {approved ? 'Revoke approval' : 'Revoked'}
                  </button>
                </div>
              </StatusRow>
              <StatusRow
                tone={remaining === 0 ? 'ok' : enabled ? 'warn' : 'info'}
                icon={remaining === 0 ? 'shieldOk' : 'recovery'}
                title="2. Claim your re-mints"
                state={remaining === 0 ? 'ALL CLAIMED' : enabled ? `${remaining} OWED` : 'CLAIMS CLOSED'}
              >
                <p>{hint}</p>
                <div className="row end">
                  <button
                    type="button"
                    className="btn default"
                    disabled={tx.busy || !!approved || remaining === 0 || !enabled}
                    onClick={() =>
                      tx.run([{ label: 'Claim', request: { address: ADDR.reclaim, abi: reclaimAbi, functionName: 'claim', args: [BigInt(RECLAIM_BATCH)] } }])
                    }
                  >
                    {claimLabel}
                  </button>
                </div>
              </StatusRow>
              <h2 className="section-h">Your stolen Remys ({owed.length})</h2>
              <div className="thumbs compact">
                {owed.map((id, i) => (
                  <Thumb key={id.toString()} index={art.get(id)} label={`#${id}`} dim={i < claimed} mark={i < claimed ? 'check' : undefined} />
                ))}
              </div>
              <p className="muted small">
                {claimed} of {owed.length} re-minted. Re-mints get new token ids with the same art.
              </p>
            </>
          )}
        </main>
      </div>
      <StatusBar status={tx.status} busy={tx.busy} right={mobile ? undefined : `RemyReclaim ${ADDR.reclaim.slice(0, 10)}…`} />
    </>
  )
}

export function Recovery({ navigate }: AppProps) {
  const { address } = useAccount()
  return (
    <div className="app-col">
      <AppHeader icon="recovery" title="Remy Recovery Center" sub="Help reclaim the Remys lost in the Payment Processor exploit" />
      <RequireWallet title="Which wallet was affected?" why="Connect the wallet that lost Remys in the exploit to check what it can reclaim.">
        <RecoveryInner key={address} navigate={navigate} />
      </RequireWallet>
    </div>
  )
}
