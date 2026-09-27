import { useState } from 'react'
import { type Address, formatUnits, parseUnits } from 'viem'
import { useAccount, useReadContract, useReadContracts } from 'wagmi'
import { readContract } from 'wagmi/actions'
import { converterAbi, erc20Abi, stakedAbi } from '../abis'
import { ADDR, NEW } from '../config'
import { fmt } from '../lib/format'
import { type TxStep, useTx } from '../lib/tx'
import { Badge, ComingSoon, Group, RequireWallet, StatusBar } from '../os/ui'
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
}: {
  name: string
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
}) {
  return (
    <Group title={name}>
      <div className="legacy-row">
        <div className="legacy-bal">
          <span className="muted small">{sub}</span>
          <b>{fmt(balance)}</b>
          {note}
        </div>
        <div className="legacy-input">
          <div className="input-wrap">
            <input className="input" inputMode="decimal" placeholder="0" value={value} onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))} />
            <button type="button" className="chip" onClick={() => max !== undefined && onChange(formatUnits(whole ? (max / ONE) * ONE : max, 18))}>
              Max
            </button>
          </div>
          <span className="muted small">
            → <b>{fmt(preview, 18, 6)}</b> fREMY
          </span>
        </div>
        <button type="button" className="btn primary" disabled={disabled} onClick={onConvert}>
          Convert
        </button>
      </div>
    </Group>
  )
}

function LegacyInner({ converter }: { converter: Address }) {
  const { address } = useAccount()
  const acct = address as Address
  const tx = useTx()
  const [rb, setRb] = useState('')
  const [ls, setLs] = useState('')
  const [w, setW] = useState('')

  const { data } = useReadContracts({
    contracts: [
      { address: ADDR.rbRemy, abi: erc20Abi, functionName: 'balanceOf', args: [acct] },
      { address: ADDR.rbRemyLS, abi: stakedAbi, functionName: 'balanceOf', args: [acct] },
      { address: ADDR.rbRemyLS, abi: stakedAbi, functionName: 'unlocked_shares', args: [acct] },
      { address: ADDR.rbRemyLS, abi: stakedAbi, functionName: 'locks', args: [acct] },
      { address: ADDR.rbRemyLS, abi: stakedAbi, functionName: 'TIME_LOCK' },
      { address: ADDR.wRemy, abi: erc20Abi, functionName: 'balanceOf', args: [acct] },
      { address: converter, abi: converterAbi, functionName: 'maxRbRemyPerCall' },
      { address: converter, abi: converterAbi, functionName: 'paused' },
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
  // Share → rbREMY rate, used to size chunks that stay under maxRbRemyPerCall.
  const { data: rateAssets } = useReadContract({
    address: ADDR.rbRemyLS,
    abi: stakedAbi,
    functionName: 'previewRedeem',
    args: [ONE],
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
      steps.push({ label: `Convert ${fmt(c, 18, 2)} rbREMY`, request: { address: converter, abi: converterAbi, functionName: 'convertRbRemy', args: [c, acct] } })
      left -= c
    }
    if (await tx.run(steps)) setRb('')
  }

  const convertLs = async () => {
    if (!lsAmt || !maxRb || !rateAssets) return
    // shares whose redeemed assets stay ≤ maxRb (previewRedeem rounds down, so this is conservative)
    const perChunk = (maxRb * ONE) / rateAssets - 1n
    const steps: TxStep[] = [approve(ADDR.rbRemyLS, lsAmt)]
    for (let left = lsAmt; left > 0n; ) {
      const c = left > perChunk ? perChunk : left
      steps.push({ label: `Convert ${fmt(c, 18, 2)} rbREMYLS`, request: { address: converter, abi: converterAbi, functionName: 'convertStaked', args: [c, acct] } })
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

  return (
    <>
      <div className="pad scroll">
        <div className="rate-card">
          <div>
            <b>1,000 rbREMY</b> = <b>1 fREMY</b>
          </div>
          <div>
            <b>1 wREMY</b> = <b>1 fREMY</b>
          </div>
          <div>
            <b>rbREMYLS</b> → its rbREMY → fREMY
          </div>
          <div className="muted small">
            fREMY is backed 1:1 by Remys in the new vault. Your balance: <b>{fmt(fremyBal, 18, 6)} fREMY</b>
          </div>
        </div>
        {paused && <div className="banner warn">The converter is paused by the team.</div>}
        <AmountRow
          name="rbREMY"
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
                <Badge tone="warn">locked</Badge> {fmt(lsUnlocked)} unlocked{unlockAt > Date.now() ? ` · rest unlocks ${new Date(unlockAt).toLocaleString()}` : ''}
              </span>
            ) : lsBal ? (
              <Badge tone="ok">unlocked</Badge>
            ) : null
          }
        />
        <AmountRow
          name="wREMY"
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
      <StatusBar status={tx.status} />
    </>
  )
}

export function Legacy() {
  if (!NEW.converter || !NEW.fremy)
    return (
      <ComingSoon title="Legacy Exchange opens soon">
        rbREMY, staked rbREMYLS and wREMY will convert into fREMY here (1,000 rbREMY = 1 wREMY = 1 fREMY). Hold on to them.
      </ComingSoon>
    )
  return (
    <div className="app-col">
      <RequireWallet why="Connect a wallet holding rbREMY, rbREMYLS or wREMY.">
        <LegacyInner converter={NEW.converter} />
      </RequireWallet>
    </div>
  )
}
