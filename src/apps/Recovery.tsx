import { useMemo } from 'react'
import { isAddressEqual } from 'viem'
import { useAccount, useReadContracts } from 'wagmi'
import { reclaimAbi, remyAbi } from '../abis'
import { ADDR, EXPLORER, RECLAIM_BATCH } from '../config'
import { useArtIndexes } from '../lib/art'
import { type ReclaimWave, useReclaimState } from '../lib/reclaim'
import type { TxStep } from '../lib/tx'
import type { AppProps } from '../os/apps'
import { useIsMobile } from '../os/shell'
import { type TxUi, useTxUi } from '../os/system'
import { AppHeader, Banner, Loading, RequireWallet, StatusBar, StatusRow, TaskBox, TaskLink, TaskPane, Thumb } from '../os/ui'

const revokeStep: TxStep = {
  label: 'Revoke approval',
  request: { address: ADDR.remy, abi: remyAbi, functionName: 'setApprovalForAll', args: [ADDR.paymentProcessor, false] },
}

function OwnerRow({ waves, tx }: { waves: ReclaimWave[]; tx: TxUi }) {
  const live = waves.filter((w) => w.deployed)
  const enabled = live.length > 0 && live.every((w) => w.minting)
  const anyOn = live.some((w) => w.minting)
  const set = (on: boolean) =>
    tx.run(
      live
        .filter((w) => w.minting !== on)
        .map((w) => ({
          label: `${on ? 'Enable' : 'Disable'} claims (${w.label})`,
          request: { address: ADDR.remy, abi: remyAbi, functionName: 'set_minter', args: [w.address, on] },
        })),
    )
  return (
    <StatusRow tone={enabled ? 'ok' : 'warn'} icon="computer" title="Collection owner: claim minting" state={enabled ? 'ON' : anyOn ? 'PARTLY ON' : 'OFF'}>
      <p>Claims mint through one RemyReclaim contract per theft wave, each needing minter rights on Remy Boys. You are the collection owner.</p>
      <ul className="muted small">
        {waves.map((w) => (
          <li key={w.address}>
            {w.label}: {!w.deployed ? 'not deployed yet' : w.minting ? 'claims open' : 'claims closed'}
          </li>
        ))}
      </ul>
      <div className="row end">
        <button type="button" className="btn" disabled={tx.busy || !anyOn} onClick={() => set(false)}>
          Disable claims
        </button>
        <button type="button" className="btn default" disabled={tx.busy || enabled || live.length === 0} onClick={() => set(true)}>
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
      { address: ADDR.remy, abi: remyAbi, functionName: 'isApprovedForAll', args: [acct, ADDR.paymentProcessor] },
    ],
    allowFailure: false,
  })
  const reclaim = useReclaimState(acct)
  const [owner, approved] = data ?? []
  const ids = useMemo(() => reclaim.data?.owed.map((o) => o.id) ?? [], [reclaim.data])
  const { map: art } = useArtIndexes(ids)
  const isOwner = !!owner && isAddressEqual(owner, acct)
  const owed = reclaim.data?.owed ?? []
  const claimed = reclaim.data?.claimed ?? 0
  const remaining = reclaim.data?.remaining ?? 0
  const enabled = reclaim.data?.claimsOpen
  const next = reclaim.data?.next
  const batch = next ? Math.min(next.owed.length - next.claimed, RECLAIM_BATCH) : 0

  if (isLoading || !data || reclaim.isLoading || !reclaim.data) return <Loading>Recovery Center is checking this wallet…</Loading>
  /** The contract this wallet deals with (Basescan link, status bar). */
  const shown = next ?? reclaim.data.waves.find((w) => w.owed.length > 0) ?? reclaim.data.waves[0]

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
              <TaskLink icon="globe" href={`${EXPLORER}/address/${shown.address}`}>
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
          {isOwner && <OwnerRow waves={reclaim.data.waves} tx={tx} />}
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
                      next &&
                      tx.run([{ label: 'Claim', request: { address: next.address, abi: reclaimAbi, functionName: 'claim', args: [BigInt(RECLAIM_BATCH)] } }])
                    }
                  >
                    {claimLabel}
                  </button>
                </div>
              </StatusRow>
              <h2 className="section-h">Your stolen Remys ({owed.length})</h2>
              <div className="thumbs compact">
                {owed.map(({ id, claimed: done }) => (
                  <Thumb key={id.toString()} index={art.get(id)} label={`#${id}`} dim={done} mark={done ? 'check' : undefined} />
                ))}
              </div>
              <p className="muted small">
                {claimed} of {owed.length} re-minted. Re-mints get new token ids with the same art.
              </p>
            </>
          )}
        </main>
      </div>
      <StatusBar status={tx.status} busy={tx.busy} right={mobile ? undefined : `RemyReclaim ${shown.address.slice(0, 10)}…`} />
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
