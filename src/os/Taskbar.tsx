import { useCallback, useEffect, useRef, useState } from 'react'
import { useAccount, useBalance, useBlockNumber, useConnect, useDisconnect } from 'wagmi'
import { fmt, shortAddr } from '../lib/format'
import { chain } from '../wagmi'
import { appById } from './apps'
import { BalloonHost } from './Balloons'
import { FlagMark, Icon } from './icons'
import { connectorLabel } from './shell'
import { StartMenu } from './StartMenu'

/** Close a popover on outside pointer-down or Escape. */
export function useOutside<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (!open) return
    const on = (e: PointerEvent) => ref.current && !ref.current.contains(e.target as Node) && close()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('pointerdown', on)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', on)
      document.removeEventListener('keydown', esc)
    }
  }, [open, close])
  return ref
}

export function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10_000)
    return () => clearInterval(t)
  }, [])
  return now
}

/** Wallet details / connector list, shared by the desktop tray popup and the Pocket PC wallet sheet. */
export function WalletPanel({ onDone }: { onDone: () => void }) {
  const { address, chainId, connector } = useAccount()
  const { connectors, connect, isPending, error } = useConnect()
  const { disconnect } = useDisconnect()
  const { data: bal } = useBalance({ address, chainId: chain.id, query: { enabled: !!address } })

  if (address)
    return (
      <div className="wallet-panel">
        <div className="wp-row">
          <Icon name="wallet" size={32} />
          <div>
            <b>Connected</b>
            <div className="muted small">via {connector ? connectorLabel(connector.name) : '…'}</div>
          </div>
        </div>
        <div className="wp-addr mono">{address}</div>
        <dl className="kv">
          <dt>Balance</dt>
          <dd>{fmt(bal?.value)} ETH</dd>
          <dt>Network</dt>
          <dd className={chainId === chain.id ? 'ok-text' : 'err'}>{chainId === chain.id ? 'Base' : 'Wrong network'}</dd>
        </dl>
        <div className="row end">
          <button
            type="button"
            className="btn"
            onClick={() => {
              disconnect()
              onDone()
            }}
          >
            Disconnect
          </button>
        </div>
      </div>
    )
  return (
    <div className="wallet-panel">
      <div className="wp-row">
        <Icon name="wallet" size={32} />
        <div>
          <b>Connect a wallet</b>
          <div className="muted small">Pick how you want to sign in.</div>
        </div>
      </div>
      <div className="connect-list">
        {connectors.map((c) => (
          <button type="button" key={c.uid} className="btn big" disabled={isPending} onClick={() => connect({ connector: c }, { onSuccess: onDone })}>
            {c.icon ? <img src={c.icon} alt="" width={20} height={20} /> : <Icon name="wallet" size={20} />}
            {connectorLabel(c.name)}
          </button>
        ))}
      </div>
      {error && <div className="err small">{error.message.split('\n')[0]}</div>}
      <p className="muted small">On a phone? Open basedremyboys.club in your wallet app's browser, or use WalletConnect.</p>
    </div>
  )
}

function Tray() {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const ref = useOutside<HTMLDivElement>(open, close)
  const { address, chainId } = useAccount()
  const { data: block, isError } = useBlockNumber({ chainId: chain.id, watch: false, query: { refetchInterval: 30_000 } })
  const now = useClock()
  const wrong = !!address && chainId !== chain.id

  return (
    <div className="tray" ref={ref}>
      <span className={`tray-icon${isError ? ' off' : ''}`} title={isError ? 'Base: not connected' : `Base: connected${block ? ` · block ${block}` : ''}`}>
        <Icon name="network" size={16} />
      </span>
      <button type="button" className={`tray-wallet${address ? ' on' : ''}${wrong ? ' wrong' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Icon name="wallet" size={16} />
        <span>{address ? shortAddr(address) : 'Connect wallet'}</span>
      </button>
      <time className="clock" dateTime={now.toISOString()} title={now.toLocaleDateString([], { dateStyle: 'full' })}>
        {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
      </time>
      {open && (
        <dialog open className="tray-pop" aria-label="Wallet">
          <div className="tray-pop-title">
            <Icon name="wallet" size={16} /> Wallet
          </div>
          <WalletPanel onDone={close} />
        </dialog>
      )}
      <BalloonHost />
    </div>
  )
}

type Props = {
  wins: { id: string; min: boolean }[]
  active?: string
  onTask: (id: string) => void
  onLaunch: (id: string) => void
  onLogOff: () => void
  onTurnOff: () => void
}

export function Taskbar({ wins, active, onTask, onLaunch, onLogOff, onTurnOff }: Props) {
  const [menu, setMenu] = useState(false)
  const close = useCallback(() => setMenu(false), [])
  const ref = useOutside<HTMLDivElement>(menu, close)

  return (
    <footer className="taskbar">
      <div className="start-wrap" ref={ref}>
        <button type="button" className={`start-btn${menu ? ' open' : ''}`} aria-expanded={menu} aria-haspopup="menu" onClick={() => setMenu((m) => !m)}>
          <FlagMark size={20} />
          <span>start</span>
        </button>
        {menu && (
          <StartMenu
            onLaunch={(id) => {
              close()
              onLaunch(id)
            }}
            onLogOff={() => {
              close()
              onLogOff()
            }}
            onTurnOff={() => {
              close()
              onTurnOff()
            }}
          />
        )}
      </div>
      <div className="tasks">
        {wins.map((w) => {
          const a = appById(w.id)
          if (!a) return null
          const on = w.id === active && !w.min
          return (
            <button type="button" key={w.id} className={`task${on ? ' active' : ''}`} onClick={() => onTask(w.id)} title={a.title} aria-pressed={on}>
              <Icon name={a.icon} size={16} />
              <span>{a.title}</span>
            </button>
          )
        })}
      </div>
      <Tray />
    </footer>
  )
}
