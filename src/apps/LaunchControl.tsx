import type { ReactNode } from 'react'
import { type Address, isAddressEqual } from 'viem'
import { useAccount } from 'wagmi'
import { readContract } from 'wagmi/actions'
import { erc20Abi, migratorRouterAbi, remyAbi } from '../abis'
import { ADDR, EXPLORER, NEW, TEAM } from '../config'
import { fmt, shortAddr } from '../lib/format'
import { useLaunchState } from '../lib/launch'
import type { TxStep } from '../lib/tx'
import { type AppProps, isTeam } from '../os/apps'
import { Icon } from '../os/icons'
import { messageBox, useIsMobile } from '../os/shell'
import { useTxUi } from '../os/system'
import { AppHeader, Banner, StatusBar, TaskBox, TaskLink, TaskPane } from '../os/ui'
import { config } from '../wagmi'

type Step = {
  id: string
  icon: string
  title: string
  /** What the button does, in plain words (also the confirmation text). */
  plain: string
  done: boolean | undefined
  state: string
  /** Wallet that can sign this step; undefined for read-only steps. */
  signer?: Address
  action?: { label: string; tx: TxStep }
  detail?: ReactNode
}

function StepRow({ step, index, busy, onRun }: { step: Step; index: number; busy: boolean; onRun: (s: Step) => void }) {
  const { address } = useAccount()
  const mine = !!step.signer && !!address && isAddressEqual(address, step.signer)
  const tone = step.done === undefined ? 'pending' : step.done ? 'ok' : 'todo'
  return (
    <li className={`lc-step ${tone}`}>
      <span className="lc-num" aria-hidden="true">
        {step.done ? <Icon name="check" size={18} /> : index + 1}
      </span>
      <Icon name={step.icon} size={32} />
      <div className="lc-text">
        <b>{step.title}</b>
        <p>{step.plain}</p>
        {step.detail}
        <span className={`lc-state ${tone}`}>
          <i />
          {step.state}
        </span>
      </div>
      <div className="lc-act">
        {step.action && !step.done ? (
          <>
            <button type="button" className="btn default" disabled={busy || !mine} onClick={() => onRun(step)}>
              {step.action.label}
            </button>
            {!mine && step.signer && <small>Connect as {shortAddr(step.signer)} to do this.</small>}
          </>
        ) : step.done ? (
          <span className="lc-done">Done</span>
        ) : (
          step.signer && <small>Done by {shortAddr(step.signer)}</small>
        )}
      </div>
    </li>
  )
}

/** Control Panel applet: the launch checklist with a button for the wallet that can do each step. */
export function LaunchControl({ navigate }: AppProps) {
  const { address } = useAccount()
  const mobile = useIsMobile()
  const tx = useTxUi()
  const { legacy, pool, claimsEnabled, ownerRb } = useLaunchState()

  const steps: Step[] = [
    {
      id: 'handover',
      icon: 'vault',
      title: 'Hand the legacy vault to the converter',
      plain: `Makes the converter (${shortAddr(NEW.converter)}) the owner of the old rbREMY vault, so rbREMY and staked rbREMYLS holders can convert to fREMY. Signed by the MigratorRouter owner.`,
      done: legacy.handedOver,
      state:
        legacy.handedOver === undefined
          ? 'Checking…'
          : legacy.handedOver
            ? 'Converter owns the legacy vault'
            : `Legacy vault owner: ${legacy.owner ? shortAddr(legacy.owner) : '…'}`,
      signer: TEAM.migrator,
      action: {
        label: 'Hand over vault',
        tx: {
          label: 'Hand over legacy vault',
          request: { address: ADDR.migratorRouter, abi: migratorRouterAbi, functionName: 'transfer_vault_ownership', args: [NEW.converter] },
        },
      },
    },
    {
      id: 'claims',
      icon: 'recovery',
      title: 'Enable claims',
      plain: 'Gives the RemyReclaim contract minter rights on Remy Boys, so exploit victims can claim their re-mints in the Recovery Center.',
      done: claimsEnabled,
      state: claimsEnabled === undefined ? 'Checking…' : claimsEnabled ? 'Claims are open' : 'Claims are closed',
      signer: TEAM.owner,
      action: {
        label: 'Enable claims',
        tx: { label: 'Enable claims', request: { address: ADDR.remy, abi: remyAbi, functionName: 'set_minter', args: [ADDR.reclaim, true] } },
      },
    },
    {
      id: 'seed-funds',
      icon: 'exchange',
      title: 'Send rbREMY to the deployer for pool seeding',
      plain: `Sends the owner's whole rbREMY balance to the deployer (${shortAddr(NEW.deployer)}), who converts it to fREMY and supplies it to the fREMY/ETH pool.`,
      done: ownerRb === undefined && !pool.live ? undefined : ownerRb === 0n || pool.live,
      state: ownerRb === undefined ? 'Checking…' : ownerRb === 0n || pool.live ? 'Sent' : `Owner holds ${fmt(ownerRb, 18, 2)} rbREMY`,
      detail:
        ownerRb !== undefined && ownerRb > 0n ? (
          <p className="lc-amount">
            <Icon name="exchange" size={16} />
            <b>≈&nbsp;{fmt(ownerRb, 18, 2)}&nbsp;rbREMY</b> → <b>≈&nbsp;{fmt(ownerRb / 1000n, 18, 3)}&nbsp;fREMY</b> for the pool
          </p>
        ) : undefined,
      signer: TEAM.owner,
      action: {
        label: 'Send rbREMY',
        tx: {
          label: 'Send rbREMY to deployer',
          request: async () => {
            const balance = await readContract(config, { address: ADDR.rbRemy, abi: erc20Abi, functionName: 'balanceOf', args: [TEAM.owner] })
            return balance === 0n ? null : { address: ADDR.rbRemy, abi: erc20Abi, functionName: 'transfer', args: [NEW.deployer, balance] }
          },
        },
      },
    },
    {
      id: 'pool',
      icon: 'eth',
      title: 'Pool seeded',
      plain:
        'The deployer opens the fREMY/ETH pool at the start price with the converted fREMY. Buying and selling Remys with ETH opens in the Remy Vault once this is done.',
      done: pool.loading ? undefined : pool.live,
      state: pool.loading
        ? 'Checking…'
        : pool.live
          ? `Live · floor ${pool.spot?.toPrecision(3)} ETH`
          : pool.spot
            ? 'Initialized, no liquidity yet'
            : 'Pool not initialized',
      signer: NEW.deployer,
    },
  ]
  const done = steps.filter((s) => s.done).length

  const run = (s: Step) =>
    s.action &&
    messageBox({
      title: 'Launch Control',
      icon: 'question',
      text: `${s.plain} Your wallet will ask you to confirm. Continue?`,
      onConfirm: () => s.action && tx.run([s.action.tx]),
    })

  return (
    <div className="app-col">
      <AppHeader icon="launch" title="Launch Control" sub="Everything the vault launch still needs, and who signs it" />
      <div className="split">
        {!mobile && (
          <TaskPane>
            <TaskBox title="Launch Progress" primary>
              <div className="lc-meter" role="img" aria-label={`${done} of ${steps.length} steps done`}>
                {steps.map((s) => (
                  <i key={s.id} className={s.done ? 'on' : ''} />
                ))}
              </div>
              <p className="small">
                <b>
                  {done} of {steps.length}
                </b>{' '}
                steps done.
              </p>
            </TaskBox>
            <TaskBox title="See Also">
              <TaskLink icon="exchange" onClick={() => navigate('legacy')}>
                Legacy Exchange
              </TaskLink>
              <TaskLink icon="vault" onClick={() => navigate('vault')}>
                Remy Vault
              </TaskLink>
              <TaskLink icon="recovery" onClick={() => navigate('recovery')}>
                Recovery Center
              </TaskLink>
              <TaskLink icon="globe" href={`${EXPLORER}/address/${NEW.converter}`}>
                Converter on Basescan
              </TaskLink>
            </TaskBox>
          </TaskPane>
        )}
        <main className="split-main scroll">
          {!isTeam(address) && (
            <Banner tone="info" icon="info" title="Launch Control is for the Remy Boys team">
              The steps below are read-only. Connect {shortAddr(TEAM.owner)} or {shortAddr(TEAM.migrator)} to act on them.
            </Banner>
          )}
          <h2 className="section-h">Pick a launch step</h2>
          <ol className="lc-steps">
            {steps.map((s, i) => (
              <StepRow key={s.id} step={s} index={i} busy={tx.busy} onRun={run} />
            ))}
          </ol>
        </main>
      </div>
      <StatusBar status={tx.status} busy={tx.busy} right={`${done} of ${steps.length} done`} />
    </div>
  )
}
