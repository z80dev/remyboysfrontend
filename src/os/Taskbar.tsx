import { useEffect, useRef, useState } from 'react'
import { useAccount, useBalance, useConnect, useDisconnect } from 'wagmi'
import { LINKS } from '../config'
import { fmt, shortAddr } from '../lib/format'
import { chain } from '../wagmi'
import { APPS, appById } from './apps'
import { Icon } from './icons'

type Props = {
  mobile: boolean
  wins: { id: string; min: boolean }[]
  active?: string
  onTask: (id: string) => void
  onLaunch: (id: string) => void
  onHome: () => void
}

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
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

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="clock" title={now.toDateString()}>
      <span>{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
      <span className="clock-date">{now.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' })}</span>
    </div>
  )
}

function WalletTray({ mobile }: { mobile: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useOutside(open, () => setOpen(false))
  const { address, chainId, connector } = useAccount()
  const { connectors, connect, isPending, error } = useConnect()
  const { disconnect } = useDisconnect()
  const { data: bal } = useBalance({ address, chainId: chain.id, query: { enabled: !!address } })

  return (
    <div className="tray-wallet" ref={ref}>
      <button type="button" className={`tray-btn${address ? ' connected' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Icon name="wallet" size={18} />
        {!mobile && <span>{address ? shortAddr(address) : 'Connect'}</span>}
        {address && <span className={`dot${chainId === chain.id ? '' : ' wrong'}`} />}
      </button>
      {open && (
        <div className="popover wallet-pop">
          {address ? (
            <>
              <div className="pop-title">Connected via {connector?.name}</div>
              <div className="mono">{address}</div>
              <div className="pop-row">
                <span>Balance</span>
                <b>{fmt(bal?.value)} ETH</b>
              </div>
              {chainId !== chain.id && <div className="warn-text">Wrong network. Actions will ask to switch to Base.</div>}
              <button type="button" className="btn" onClick={() => (disconnect(), setOpen(false))}>
                Disconnect
              </button>
            </>
          ) : (
            <>
              <div className="pop-title">Connect a wallet</div>
              {connectors.map((c) => (
                <button type="button" key={c.uid} className="btn wide" disabled={isPending} onClick={() => connect({ connector: c }, { onSuccess: () => setOpen(false) })}>
                  {c.name}
                </button>
              ))}
              {error && <div className="err small">{error.message.split('\n')[0]}</div>}
              <div className="muted small">On a phone? Open basedremyboys.club inside your wallet app's browser, or use WalletConnect.</div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function Taskbar({ mobile, wins, active, onTask, onLaunch, onHome }: Props) {
  const [menu, setMenu] = useState(false)
  const ref = useOutside(menu, () => setMenu(false))
  const launch = (id: string) => (setMenu(false), onLaunch(id))

  return (
    <footer className="taskbar">
      <div className="start-wrap" ref={ref}>
        <button type="button" className={`start-orb${menu ? ' open' : ''}`} aria-label="Start" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
          <img src="/images/Character0.webp" alt="" />
        </button>
        {menu && (
          <div className="start-menu popover">
            <div className="sm-left">
              {APPS.map((a) => (
                <button type="button" key={a.id} className="sm-item" onClick={() => launch(a.id)}>
                  <span className="sm-glyph" style={{ ['--accent' as string]: a.accent }}>
                    <Icon name={a.icon} size={20} />
                  </span>
                  {a.title}
                </button>
              ))}
            </div>
            <div className="sm-right">
              <div className="sm-avatar">
                <img src="/images/Character4489.webp" alt="" />
              </div>
              {LINKS.map((l) => (
                <a key={l.href} className="sm-link" href={l.href} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
      {mobile && (
        <button type="button" className="task home-btn" onClick={onHome} aria-label="Home">
          <Icon name="home" size={18} />
        </button>
      )}
      <div className="tasks">
        {wins.map((w) => {
          const a = appById(w.id)
          if (!a) return null
          return (
            <button type="button" key={w.id} className={`task${w.id === active && !w.min ? ' active' : ''}`} onClick={() => onTask(w.id)} title={a.title}>
              <Icon name={a.icon} size={18} />
              <span>{a.short}</span>
            </button>
          )
        })}
      </div>
      <div className="tray">
        <WalletTray mobile={mobile} />
        {!mobile && <Clock />}
      </div>
    </footer>
  )
}
