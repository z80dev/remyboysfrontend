import { useState } from 'react'
import { type Address, formatUnits, getAddress, isAddress, parseUnits, zeroAddress } from 'viem'
import { useAccount, useReadContract } from 'wagmi'
import { readContract } from 'wagmi/actions'
import { erc20Abi, permit2Abi } from '../abis'
import { ADDR, EXPLORER, NEW } from '../config'
import { fmt, shortAddr } from '../lib/format'
import type { TxStep } from '../lib/tx'
import { config } from '../wagmi'
import { Icon } from '../os/icons'
import { useTxUi } from '../os/system'
import { Banner, Group, RequireWallet, StatusBar } from '../os/ui'

/** Contracts that would swallow a plain fREMY transfer (the vault stack takes fREMY through approvals, not transfers). */
const SINKS: Record<Address, string> = {
  [zeroAddress]: 'the zero address',
  [NEW.fremy]: 'the fREMY token contract',
  [NEW.vault]: 'the Remy Vault',
  [NEW.router]: 'the RemyRouter',
  [NEW.converter]: 'the converter',
}

function parse(v: string): bigint | undefined {
  try {
    return v ? parseUnits(v, 18) : undefined
  } catch {
    return undefined
  }
}

function SendInner() {
  const { address } = useAccount()
  const me = address as Address
  const tx = useTxUi()
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  /** The wallet failed on a plain `transfer`; offer the Permit2 route, whose calls wallets don't decode as a token send. */
  const [viaPermit2, setViaPermit2] = useState(false)
  const { data: balance } = useReadContract({
    address: NEW.fremy,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [me],
  })

  const recipient = isAddress(to) ? getAddress(to) : undefined
  const sink = recipient && SINKS[recipient]
  const self = recipient === me
  const value = parse(amount)
  const toError = to && !recipient ? 'Not a valid address.' : sink ? `That is ${sink}; fREMY sent there is lost.` : undefined
  const amountError =
    amount && value === undefined
      ? 'Not a valid amount.'
      : value !== undefined && balance !== undefined && value > balance
        ? 'More than your balance.'
        : undefined
  const ready = !!recipient && !sink && !self && !!value && !amountError && !tx.busy

  const send = async (permit2: boolean) => {
    if (!recipient || !value) return
    const label = `Send ${fmt(value, 18, 6)} fREMY to ${shortAddr(recipient)}`
    const steps: TxStep[] = permit2
      ? [
          {
            label: 'Approve fREMY for Permit2',
            request: async () =>
              (await readContract(config, { address: NEW.fremy, abi: erc20Abi, functionName: 'allowance', args: [me, ADDR.permit2] })) >= value
                ? null
                : { address: NEW.fremy, abi: erc20Abi, functionName: 'approve', args: [ADDR.permit2, value] },
          },
          {
            label: 'Allow this wallet to move its fREMY through Permit2',
            request: async () => {
              const [allowed, expiration] = await readContract(config, {
                address: ADDR.permit2,
                abi: permit2Abi,
                functionName: 'allowance',
                args: [me, NEW.fremy, me],
              })
              const now = Math.floor(Date.now() / 1000)
              return allowed >= value && expiration > now + 600
                ? null
                : { address: ADDR.permit2, abi: permit2Abi, functionName: 'approve', args: [NEW.fremy, me, value, now + 3600] }
            },
          },
          { label, request: { address: ADDR.permit2, abi: permit2Abi, functionName: 'transferFrom', args: [me, recipient, value, NEW.fremy] } },
        ]
      : [{ label, request: { address: NEW.fremy, abi: erc20Abi, functionName: 'transfer', args: [recipient, value] } }]
    if (await tx.run(steps)) {
      setTo('')
      setAmount('')
    } else if (!permit2) setViaPermit2(true)
  }

  return (
    <>
      <div className="scroll grow pad">
        <div className="lx-balance">
          <Icon name="coin" size={48} />
          <div>
            <small>Your fREMY</small>
            <b>{fmt(balance, 18, 6)}</b>
          </div>
          <p className="muted small">
            Token contract{' '}
            <a className="mono" href={`${EXPLORER}/token/${NEW.fremy}`} target="_blank" rel="noreferrer" title={NEW.fremy}>
              {shortAddr(NEW.fremy)}
            </a>
            . Add it to your wallet as a custom token to see it there.
          </p>
        </div>
        <Group title="Recipient">
          <label className="sr-only" htmlFor="send-to">
            Recipient address
          </label>
          <input id="send-to" className="input mono" style={{ width: '100%' }} placeholder="0x…" value={to} onChange={(e) => setTo(e.target.value.trim())} />
          {toError && <p className="err small">{toError}</p>}
          {self && <p className="muted small">That is this wallet.</p>}
        </Group>
        <Group title="Amount">
          <label className="sr-only" htmlFor="send-amount">
            fREMY amount
          </label>
          <div className="input-wrap">
            <input
              id="send-amount"
              className="input"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
            />
            <button
              type="button"
              className="chip"
              disabled={balance === undefined}
              onClick={() => balance !== undefined && setAmount(formatUnits(balance, 18))}
            >
              Max
            </button>
          </div>
          {amountError && <p className="err small">{amountError}</p>}
        </Group>
        {balance === 0n && (
          <Banner tone="info" icon="info" title="No fREMY in this wallet">
            Deposit a Remy in the Remy Vault or convert legacy tokens in the Legacy Exchange to get some.
          </Banner>
        )}
        {viaPermit2 && (
          <Banner tone="warn" icon="shieldWarn" title="Wallet couldn't send fREMY directly?">
            Some wallets crash on transfers of tokens they don't list (e.g. "Cannot read property 'decimals' of undefined"). Send through Uniswap's Permit2
            instead: up to two approvals for this amount, then the transfer.
          </Banner>
        )}
        <div className="row end">
          {viaPermit2 && (
            <button type="button" className="btn" disabled={!ready} onClick={() => send(true)}>
              Send via Permit2
            </button>
          )}
          <button type="button" className="btn default" disabled={!ready} onClick={() => send(false)}>
            Send
          </button>
        </div>
      </div>
      <StatusBar status={tx.status} busy={tx.busy}>
        Transfers are final. Double-check the address.
      </StatusBar>
    </>
  )
}

export function Send() {
  const { address } = useAccount()
  return (
    <div className="app-col">
      <RequireWallet why="Connect a wallet to send fREMY.">
        <SendInner key={address} />
      </RequireWallet>
    </div>
  )
}
