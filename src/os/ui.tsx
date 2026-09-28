import { type ReactNode, useState } from 'react'
import { useAccount, useConnect } from 'wagmi'
import { EXPLORER } from '../config'
import type { TxStatus } from '../lib/tx'
import { Icon } from './icons'
import { connectorLabel } from './shell'

export function Group({ title, children, className = '' }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <fieldset className={`group ${className}`}>
      {title && <legend>{title}</legend>}
      {children}
    </fieldset>
  )
}

export type Tone = 'ok' | 'warn' | 'bad' | 'info'

export function Badge({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>
}

/** Sunken XP status bar. Transaction progress shows a chunk bar while the wallet or chain is working. */
export function StatusBar({ status, busy, children, right }: { status?: TxStatus; busy?: boolean; children?: ReactNode; right?: ReactNode }) {
  return (
    <footer className="statusbar">
      <output className={`sb-cell grow${status?.error ? ' err' : ''}`}>
        {busy && <Progress small />}
        {status?.msg || children || 'Ready'}
      </output>
      {status?.hash && (
        <a className="sb-cell" href={`${EXPLORER}/tx/${status.hash}`} target="_blank" rel="noreferrer">
          View transaction
        </a>
      )}
      {right && <span className="sb-cell">{right}</span>}
    </footer>
  )
}

/** XP marquee progress bar (three green chunks running across). A native <progress> carries the semantics. */
export function Progress({ small }: { small?: boolean }) {
  return (
    <span className={`progress${small ? ' small' : ''}`}>
      <progress className="sr-only" aria-label="Working" />
      <span className="progress-run" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </span>
  )
}

export function Loading({ children }: { children: ReactNode }) {
  return (
    <div className="loading" aria-live="polite">
      <Progress />
      <span>{children}</span>
    </div>
  )
}

export function ConnectPrompt({ why, title = 'Connect a wallet' }: { why: string; title?: string }) {
  const { connectors, connect, isPending, error } = useConnect()
  return (
    <div className="connect-prompt">
      <div className="msg-body">
        <Icon name="wallet" size={48} />
        <div>
          <h2>{title}</h2>
          <p>{why}</p>
        </div>
      </div>
      <div className="connect-list">
        {connectors.map((c) => (
          <button type="button" key={c.uid} className="btn big" disabled={isPending} onClick={() => connect({ connector: c })}>
            {c.icon ? <img src={c.icon} alt="" width={20} height={20} /> : <Icon name="wallet" size={20} />}
            {connectorLabel(c.name)}
          </button>
        ))}
      </div>
      {error && <p className="err small">{error.message.split('\n')[0]}</p>}
      <p className="muted small">On a phone? Open basedremyboys.club in your wallet app's browser, or use WalletConnect.</p>
    </div>
  )
}

export function RequireWallet({ why, title, children }: { why: string; title?: string; children: ReactNode }) {
  const { address } = useAccount()
  return address ? <>{children}</> : <ConnectPrompt why={why} title={title} />
}

/** Explorer thumbnail tile. */
export function Thumb({
  index,
  label,
  selected,
  onClick,
  dim,
  mark,
}: { index?: number; label: string; selected?: boolean; onClick?: () => void; dim?: boolean; mark?: 'check' }) {
  const inner = (
    <>
      <span className="thumb-frame">
        {index === undefined ? <span className="thumb-ph" /> : <img src={`/images/Character${index}.webp`} alt="" loading="lazy" decoding="async" />}
        {(selected || mark) && (
          <span className="thumb-check" aria-hidden="true">
            <Icon name="check" size={14} />
          </span>
        )}
      </span>
      <span className="thumb-label">{label}</span>
    </>
  )
  const cls = `thumb${selected ? ' selected' : ''}${dim ? ' dim' : ''}`
  return onClick ? (
    <button type="button" className={cls} onClick={onClick} aria-pressed={selected} aria-label={label}>
      {inner}
    </button>
  ) : (
    <div className={cls} aria-label={label}>
      {inner}
    </div>
  )
}

/** Explorer task pane (the blue column of collapsible boxes on the left). */
export function TaskPane({ children }: { children: ReactNode }) {
  return <aside className="taskpane">{children}</aside>
}

export function TaskBox({ title, primary, children }: { title: string; primary?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <section className={`taskbox${primary ? ' primary' : ''}${open ? '' : ' closed'}`}>
      <button type="button" className="taskbox-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>{title}</span>
        <span className="taskbox-chev" aria-hidden="true" />
      </button>
      {open && <div className="taskbox-body">{children}</div>}
    </section>
  )
}

export function TaskLink({
  icon,
  onClick,
  href,
  disabled,
  strong,
  children,
}: { icon: string; onClick?: () => void; href?: string; disabled?: boolean; strong?: boolean; children: ReactNode }) {
  const inner = (
    <>
      <Icon name={icon} size={16} />
      <span>{children}</span>
    </>
  )
  return href ? (
    <a className="tasklink" href={href} target="_blank" rel="noreferrer">
      {inner}
    </a>
  ) : (
    <button type="button" className={`tasklink${strong ? ' strong' : ''}`} onClick={onClick} disabled={disabled}>
      {inner}
    </button>
  )
}

/** Control Panel applet header: big icon, title, one-line purpose. */
export function AppHeader({ icon, title, sub, children }: { icon: string; title: string; sub: string; children?: ReactNode }) {
  return (
    <header className="app-header">
      <Icon name={icon} size={48} />
      <div className="grow">
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      {children}
    </header>
  )
}

/** Security Center style alert band. */
export function Banner({ tone, icon, title, children }: { tone: Tone; icon: string; title: string; children?: ReactNode }) {
  return (
    <div className={`banner ${tone}`} role={tone === 'bad' ? 'alert' : undefined}>
      <Icon name={icon} size={32} />
      <div>
        <b>{title}</b>
        {children && <p>{children}</p>}
      </div>
    </div>
  )
}

/** Security Center essentials row: coloured head with state, expandable body. */
export function StatusRow({
  tone,
  icon,
  title,
  state,
  defaultOpen = true,
  children,
}: { tone: Tone; icon: string; title: string; state: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={`srow ${tone}`}>
      <button type="button" className="srow-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Icon name={icon} size={24} />
        <span className="srow-title">{title}</span>
        <span className="srow-state">
          <i />
          {state}
        </span>
        <span className="srow-chev" aria-hidden="true" />
      </button>
      {open && <div className="srow-body">{children}</div>}
    </section>
  )
}

export function AddressBar({ icon, path, children }: { icon: string; path: string; children?: ReactNode }) {
  return (
    <div className="addressbar">
      <span className="addr-label">Address</span>
      <div className="addr-field">
        <Icon name={icon} size={16} />
        <span className="addr-path">{path}</span>
        {children}
      </div>
    </div>
  )
}
