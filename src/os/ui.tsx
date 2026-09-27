import type { ReactNode } from 'react'
import { useAccount, useConnect } from 'wagmi'
import { EXPLORER } from '../config'
import type { TxStatus } from '../lib/tx'
import { Icon } from './icons'

export function Group({ title, children, className = '' }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <fieldset className={`group ${className}`}>
      {title && <legend>{title}</legend>}
      {children}
    </fieldset>
  )
}

export function Badge({ tone = 'info', children }: { tone?: 'ok' | 'warn' | 'bad' | 'info'; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>
}

export function StatusBar({ status, children }: { status?: TxStatus; children?: ReactNode }) {
  return (
    <footer className="statusbar">
      <span className={status?.error ? 'err' : ''} role="status">
        {status?.msg || children || 'Ready'}
      </span>
      {status?.hash && (
        <a href={`${EXPLORER}/tx/${status.hash}`} target="_blank" rel="noreferrer">
          view tx
        </a>
      )}
    </footer>
  )
}

export function ConnectPrompt({ why }: { why: string }) {
  const { connectors, connect, isPending } = useConnect()
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon name="wallet" size={40} />
      </div>
      <p>{why}</p>
      <div className="row center wrap">
        {connectors.map((c) => (
          <button type="button" key={c.uid} className="btn primary" disabled={isPending} onClick={() => connect({ connector: c })}>
            {c.name}
          </button>
        ))}
      </div>
    </div>
  )
}

export function RequireWallet({ why, children }: { why: string; children: ReactNode }) {
  const { address } = useAccount()
  return address ? <>{children}</> : <ConnectPrompt why={why} />
}

export function ComingSoon({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="coming-soon">
      <div className="cs-art">
        <img src="/images/Character1337.webp" alt="" />
        <div className="cs-tape">Under construction</div>
      </div>
      <h2>{title}</h2>
      <div className="muted">{children}</div>
    </div>
  )
}

export function Thumb({ index, label, selected, onClick, dim }: { index?: number; label: string; selected?: boolean; onClick?: () => void; dim?: boolean }) {
  const inner = (
    <>
      {index === undefined ? <div className="thumb-ph" /> : <img src={`/images/Character${index}.webp`} alt={label} loading="lazy" />}
      <span className="thumb-label">{label}</span>
    </>
  )
  const cls = `thumb${selected ? ' selected' : ''}${dim ? ' dim' : ''}`
  return onClick ? (
    <button type="button" className={cls} onClick={onClick} aria-pressed={selected}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  )
}
