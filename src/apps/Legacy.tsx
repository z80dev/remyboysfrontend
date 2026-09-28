import { useState } from 'react'
import { type Address, formatUnits, parseUnits } from 'viem'
import { useAccount, useReadContract, useReadContracts } from 'wagmi'
import { readContract } from 'wagmi/actions'
import { converterAbi, erc20Abi, stakedAbi } from '../abis'
import { ADDR, EXPLORER, NEW } from '../config'
import { useLegacyHandedOver } from '../lib/launch'
import { fmt, shortAddr } from '../lib/format'
import type { TxStep } from '../lib/tx'
import { Icon } from '../os/icons'
import { useIsMobile } from '../os/shell'
import { useTxUi } from '../os/system'
import { Badge, Banner, RequireWallet, StatusBar } from '../os/ui'
import { config } from '../wagmi'

const ONE = 10n ** 18n
const PER_NFT_RB = 1000n * ONE

function parse(v: string): bigint | undefined {
  try {
    return v ? parseUnits(v, 18) : undefined
  } catch {
    return undefined
  }
}

function AmountRow({
  name,
  icon,
  rate,
  sub,
  balance,
  max,
  preview,
  value,
  onChange,
  onConvert,
  disabled,
  whole,
  note,
  closed,
}: {
  name: string
  icon: string
  rate: string
  sub: string
  balance?: bigint
  max?: bigint
  preview?: bigint
  value: string
  onChange: (v: string) => void
  onConvert: () => void
  disabled: boolean
  whole?: boolean
  note?: React.ReactNode
  /** Row is not open yet: show this instead of the amount field and Convert. */
  closed?: string
}) {
  const id = `lx-${name.split(' ')[0]}`
  return (
    <section className="lx-row">
      <div className="lx-token">
        <Icon name={icon} size={32} />
        <div>
          <b>{name}</b>
          <small>{rate}</small>
        </div>
      </div>
      <div className="lx-bal">
        <span className="muted small">{sub}</span>
        <b>{fmt(balance)}</b>
        {note}
      </div>
      {closed ? (
        <div className="lx-closed">
          <Icon name="info" size={16} />
          <span>{closed}</span>
        </div>
      ) : (
        <>
          <div className="lx-input">
            <label className="sr-only" htmlFor={id}>
              {name} amount
            </label>
            <div className="input-wrap">
              <input
                id={id}
                className="input"
                inputMode="decimal"
                placeholder="0"
                value={value}
                onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
              />
              <button type="button" className="chip" onClick={() => max !== undefined && onChange(formatUnits(whole ? (max / ONE) * ONE : max, 18))}>
                Max
              </button>
            </div>
            <span className="lx-out">
              <Icon name="coin" size={16} /> <b>{fmt(preview ?? 0n, 18, 6)}</b> fREMY
            </span>
          </div>
          <button type="button" className="btn default" disabled={disabled} onClick={onConvert}>
            Convert
          </button>
        </>
      )}
    </section>
  )
}

function LegacyInner({ converter }: { converter: Address }) {
  const { address } = useAccount()
  const acct = address as Address
  const tx = useTxUi()
  const mobile = useIsMobile()
  const [rb, setRb] = useState('')
  const [ls, setLs] = useState('')
  const [w, setW] = useState('')

  const { data, isError, refetch } = useReadContracts({
    contracts: [
      { address: ADDR.rbRemy, abi: erc20Abi, functionName: 'balanceOf', args: [acct] },
      { address: ADDR.rbRemyLS, abi: stakedAbi, functionName: 'balanceOf', args: [acct] },
      { address: ADDR.rbRemyLS, abi: stakedAbi, functionName: 'unlocked_shares', args: [acct] },
      { address: ADDR.rbRemyLS, abi: stakedAbi, functionName: 'locks', args: [acct] },
      { address: ADDR.rbRemyLS, abi: stakedAbi, functionName: 'TIME_LOCK' },
      { address: ADDR.wRemy, abi: erc20Abi, functionName: 'balanceOf', args: [acct] },
      { address: converter, abi: converterAbi, functionName: 'maxRbRemyPerCall' },
      { address: converter, abi: converterAbi, functionName: 'paused' },
      { address: converter, abi: converterAbi, functionName: 'maxStakedPerCall' },
    ],
    allowFailure: true,
  })
  const val = <T,>(i: number) => (data?.[i]?.status === 'success' ? (data[i].result as T) : undefined)
  const rbBal = val<bigint>(0)
  const lsBal = val<bigint>(1)
  const lsUnlocked = val<bigint>(2) ?? lsBal
  const lockStart = val<bigint>(3)
  const timeLock = val<bigint>(4)
  const wBal = val<bigint>(5)
  const maxRb = val<bigint>(6)
  const paused = val<boolean>(7)
  const maxStaked = val<bigint>(8)
  const { data: fremyBal } = useReadContract({ address: NEW.fremy, abi: erc20Abi, functionName: 'balanceOf', args: [acct] })

  const rbAmt = parse(rb)
  const lsAmt = parse(ls)
  const wCount = parse(w) !== undefined ? (parse(w) as bigint) / ONE : undefined

  const { data: lsAssets } = useReadContract({
    address: converter,
    abi: converterAbi,
    functionName: 'previewStaked',
    args: [lsAmt ?? 0n],
    query: { enabled: !!lsAmt },
  })
  const approve = (token: Address, amount: bigint): TxStep => ({
    label: 'Approve',
    request: async () => {
      const allowance = await readContract(config, { address: token, abi: erc20Abi, functionName: 'allowance', args: [acct, converter] })
      return allowance >= amount ? null : { address: token, abi: erc20Abi, functionName: 'approve', args: [converter, amount] }
    },
  })

  const convertRb = async () => {
    if (!rbAmt || !maxRb) return
    const steps: TxStep[] = [approve(ADDR.rbRemy, rbAmt)]
    for (let left = rbAmt; left > 0n; ) {
      const c = left > maxRb ? maxRb : left
      steps.push({
        label: `Convert ${fmt(c, 18, 2)} rbREMY`,
        request: { address: converter, abi: converterAbi, functionName: 'convertRbRemy', args: [c, acct] },
      })
      left -= c
    }
    if (await tx.run(steps)) setRb('')
  }

  const convertLs = async () => {
    if (!lsAmt || !maxStaked) return
    const perChunk = maxStaked
    const steps: TxStep[] = [approve(ADDR.rbRemyLS, lsAmt)]
    for (let left = lsAmt; left > 0n; ) {
      const c = left > perChunk ? perChunk : left
      steps.push({
        label: `Convert ${fmt(c, 18, 2)} rbREMYLS`,
        request: { address: converter, abi: converterAbi, functionName: 'convertStaked', args: [c, acct] },
      })
      left -= c
    }
    if (await tx.run(steps)) setLs('')
  }

  const convertW = async () => {
    if (!wCount || !maxRb) return
    const perCall = maxRb / PER_NFT_RB || 1n
    const steps: TxStep[] = [approve(ADDR.wRemy, wCount * ONE)]
    for (let left = wCount; left > 0n; ) {
      const c = left > perCall ? perCall : left
      steps.push({ label: `Convert ${c} wREMY`, request: { address: converter, abi: converterAbi, functionName: 'convertWrapped', args: [c, acct] } })
      left -= c
    }
    if (await tx.run(steps)) setW('')
  }

  const unlockAt = lockStart && timeLock ? Number(lockStart + timeLock) * 1000 : 0
  const locked = lsBal !== undefined && lsUnlocked !== undefined && lsUnlocked < lsBal
  const off = tx.busy || !!paused
  const { handedOver } = useLegacyHandedOver()
  const legacyClosed = handedOver === false ? 'Opens soon — the old vault is being handed over.' : undefined

  return (
    <>
      <div className="scroll grow wiz-body">
        <div className="lx-balance">
          <Icon name="coin" size={32} />
          <div>
            <small>Your fREMY</small>
            <b>{fmt(fremyBal, 18, 6)}</b>
            <small>
              Wallet{' '}
              <a href={`${EXPLORER}/address/${acct}`} target="_blank" rel="noreferrer" title={acct}>
                {shortAddr(acct)}
              </a>
            </small>
          </div>
          <p className="muted small">fREMY is backed 1:1 by Remys in the new vault. Redeem 1 fREMY for any Remy there.</p>
        </div>
        {handedOver === false && (
          <Banner tone="info" icon="info" title="rbREMY and rbREMYLS open soon">
            The old vault is being handed over to the converter. wREMY converts now; rbREMY and staked rbREMYLS unlock right after the handover.
          </Banner>
        )}
        {paused && (
          <Banner tone="warn" icon="warning" title="The converter is paused">
            The team has paused conversions. Your tokens are safe; try again later.
          </Banner>
        )}
        {isError && (
          <Banner tone="warn" icon="warning" title="Couldn't read your balances">
            Base didn't answer the balance check.{' '}
            <button type="button" className="linkish" onClick={() => refetch()}>
              Try again
            </button>
          </Banner>
        )}
        {rbBal === 0n && lsBal === 0n && wBal === 0n && (
          <Banner tone="info" icon="info" title={`Nothing to convert in ${shortAddr(acct)}`}>
            This wallet holds no rbREMY, rbREMYLS or wREMY. If yours sit in another account, switch accounts in your wallet and this window
            updates.
          </Banner>
        )}
        <AmountRow
          name="rbREMY"
          closed={legacyClosed}
          icon="exchange"
          rate="1,000 → 1 fREMY"
          sub="Balance"
          balance={rbBal}
          max={rbBal}
          preview={rbAmt !== undefined ? rbAmt / 1000n : undefined}
          value={rb}
          onChange={setRb}
          onConvert={convertRb}
          disabled={off || !rbAmt || !rbBal || rbAmt > rbBal}
        />
        <AmountRow
          name="rbREMYLS (staked)"
          closed={legacyClosed}
          icon="vault"
          rate="Unstaked to rbREMY, then 1,000 → 1"
          sub="Shares"
          balance={lsBal}
          max={lsUnlocked}
          preview={lsAmt ? lsAssets : undefined}
          value={ls}
          onChange={setLs}
          onConvert={convertLs}
          disabled={off || !lsAmt || !lsUnlocked || lsAmt > lsUnlocked}
          note={
            locked ? (
              <span className="small">
                <Badge tone="warn">locked</Badge> {fmt(lsUnlocked)} unlocked
                {unlockAt > Date.now() ? ` · rest unlocks ${new Date(unlockAt).toLocaleString()}` : ''}
              </span>
            ) : lsBal ? (
              <Badge tone="ok">unlocked</Badge>
            ) : null
          }
        />
        <AmountRow
          name="wREMY"
          icon="coin"
          rate="1 → 1 fREMY, whole units"
          sub="Balance"
          balance={wBal}
          max={wBal}
          whole
          preview={wCount !== undefined ? wCount * ONE : undefined}
          value={w}
          onChange={setW}
          onConvert={convertW}
          disabled={off || !wCount || !wBal || wCount * ONE > wBal}
          note={wBal && wBal % ONE ? <span className="muted small">whole units only</span> : null}
        />
        <p className="muted small">Large amounts are split into several transactions automatically ({fmt(maxRb, 18, 0)} rbREMY per call).</p>
      </div>
      <StatusBar status={tx.status} busy={tx.busy} right={mobile ? undefined : 'Legacy Exchange'} />
    </>
  )
}

function WizardFrame({ children }: { children: React.ReactNode }) {
  const mobile = useIsMobile()
  return (
    <div className="app-col">
      <div className="wiz">
        {!mobile && (
          <aside className="wiz-side" aria-hidden="true">
            <img src="/images/Character777.webp" alt="" />
            <span>
              Legacy
              <br />
              Transfer
              <br />
              Wizard
            </span>
          </aside>
        )}
        <div className="wiz-main">
          <header className="wiz-head">
            <div>
              <b>Convert legacy tokens</b>
              <span>rbREMY, staked rbREMYLS and wREMY become fREMY at the fixed old rates.</span>
            </div>
            <Icon name="exchange" size={48} />
          </header>
          {children}
        </div>
      </div>
    </div>
  )
}

export function Legacy() {
  const { address } = useAccount()
  return (
    <WizardFrame>
      <RequireWallet why="Connect a wallet holding rbREMY, rbREMYLS or wREMY.">
        <LegacyInner key={address} converter={NEW.converter} />
      </RequireWallet>
    </WizardFrame>
  )
}
