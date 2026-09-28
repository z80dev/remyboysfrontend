import { useEffect, useRef, useState } from 'react'
import { useAccount, useConnect } from 'wagmi'
import { shortAddr } from '../lib/format'
import { isAdmin, teamRole } from '../lib/launch'
import { FlagMark, Icon, RemyFlag } from './icons'
import { connectorLabel } from './shell'
import { GUEST_ART, UserPicture } from './StartMenu'
import { useWalletRemy } from './system'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Wordmark({ big }: { big?: boolean }) {
  return (
    <span className={`wordmark${big ? ' big' : ''}`}>
      <span className="wm-remy">Remy</span>
      <span className="wm-os">OS</span>
      <span className="wm-xp">xp</span>
    </span>
  )
}

export type SessionStage = 'boot' | 'login'

/**
 * Boot → Welcome (log-on) → "welcome" splash. The log-on screen doubles as the wallet picker:
 * choose your Remy (connected wallet), a connector, or Guest.
 */
export function Session({ stage, onDone }: { stage: SessionStage; onDone: () => void }) {
  const [phase, setPhase] = useState<'boot' | 'login' | 'welcome'>(() => (stage === 'boot' && !reducedMotion() ? 'boot' : 'login'))

  useEffect(() => {
    if (phase === 'boot') {
      const t = setTimeout(() => setPhase('login'), 2600)
      const skip = (e: KeyboardEvent) => (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') && setPhase('login')
      document.addEventListener('keydown', skip)
      return () => {
        clearTimeout(t)
        document.removeEventListener('keydown', skip)
      }
    }
    if (phase === 'welcome') {
      const t = setTimeout(onDone, reducedMotion() ? 0 : 1100)
      return () => clearTimeout(t)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onDone()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [phase, onDone])

  if (phase === 'boot')
    return (
      // biome-ignore lint/a11y/useKeyWithClickEvents: Escape/Enter/Space skip is bound on document above
      <dialog open className="boot" onClick={() => setPhase('login')} aria-label="Remy OS is starting. Click or press Escape to skip.">
        <div className="boot-center">
          <RemyFlag size={132} />
          <Wordmark big />
          <div className="boot-bar" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
        <span className="boot-copy">Copyright © 2023–2026 Based Remy Boys</span>
        <span className="boot-skip">Click or press Esc to skip</span>
        <span className="boot-brand">Remy Boys</span>
      </dialog>
    )

  return (
    <dialog open className={`logon${phase === 'welcome' ? ' welcome' : ''}`} aria-label="Welcome to Remy OS">
      <div className="logon-top" />
      <div className="logon-mid">
        {phase === 'welcome' ? (
          <div className="logon-welcome">welcome</div>
        ) : (
          <>
            <div className="logon-brand">
              <RemyFlag size={124} />
              <Wordmark />
              <p>To begin, click your Remy</p>
            </div>
            <div className="logon-divider" />
            <Users onLogOn={() => setPhase('welcome')} />
          </>
        )}
      </div>
      <div className="logon-bottom">
        {phase === 'login' && (
          <>
            <button type="button" className="logon-skip" onClick={onDone}>
              <Icon name="power" size={24} />
              Skip to desktop
            </button>
            <p>After you log on, you can connect or switch wallets from the notification area.</p>
          </>
        )}
      </div>
    </dialog>
  )
}

function Users({ onLogOn }: { onLogOn: () => void }) {
  const { address } = useAccount()
  const { connectors, connect, isPending, error } = useConnect()
  const { count } = useWalletRemy(address)
  const [picking, setPicking] = useState(false)
  const first = useRef<HTMLButtonElement>(null)
  useEffect(() => first.current?.focus(), [])
  // Continue as soon as a wallet chosen here connects. Mutation callbacks alone are not reliable across wallets.
  useEffect(() => {
    if (picking && address) onLogOn()
  }, [picking, address, onLogOn])
  const role = teamRole(address) ?? (isAdmin(address) ? 'Administrator' : undefined)

  return (
    <div className="logon-users">
      {address && (
        <button type="button" ref={first} className="user-tile" onClick={onLogOn}>
          <UserPicture address={address} size={64} />
          <span>
            <b>{shortAddr(address)}</b>
            <small>{role ?? (count ? `${count} Remy${count === 1 ? '' : 's'}` : 'Wallet connected')}</small>
          </span>
        </button>
      )}
      {!address && (
        <div className={`user-tile-wrap${picking ? ' open' : ''}`}>
          <button type="button" ref={first} className={`user-tile${picking ? ' selected' : ''}`} onClick={() => setPicking((p) => !p)} aria-expanded={picking}>
            <span className="user-pic icon-pic" style={{ width: 64, height: 64 }}>
              <Icon name="wallet" size={48} />
            </span>
            <span>
              <b>Connect wallet</b>
              <small>Recovery, vault and exchange</small>
            </span>
          </button>
          {picking && (
            <div className="logon-connectors">
              <span className="small">Choose your wallet:</span>
              {connectors.map((c) => (
                <button
                  type="button"
                  key={c.uid}
                  className="logon-connector"
                  disabled={isPending}
                  onClick={() => connect({ connector: c })}
                >
                  <span>{connectorLabel(c.name)}</span>
                  <Icon name="go" size={22} />
                </button>
              ))}
              {error && <span className="logon-err">{error.message.split('\n')[0]}</span>}
            </div>
          )}
        </div>
      )}
      <button type="button" className="user-tile" onClick={onLogOn}>
        <span className="user-pic" style={{ width: 64, height: 64 }}>
          <img src={`/images/Character${GUEST_ART}.webp`} alt="" />
        </span>
        <span>
          <b>Guest</b>
          <small>Look around first</small>
        </span>
      </button>
    </div>
  )
}

type PowerProps = { onStandBy: () => void; onTurnOff: () => void; onRestart: () => void; onCancel: () => void }

/** XP "Turn off computer" dialog. The desktop behind it fades to grey. */
export function TurnOffDialog({ onStandBy, onTurnOff, onRestart, onCancel }: PowerProps) {
  const first = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    first.current?.focus()
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onCancel])
  return (
    <div className="modal-layer power-layer">
      <dialog open className="power" aria-modal="true" aria-labelledby="power-title">
        <header>
          <h2 id="power-title">Turn off Remy OS</h2>
          <FlagMark size={30} />
        </header>
        <div className="power-body">
          <button type="button" ref={first} className="power-btn" onClick={onStandBy}>
            <Icon name="standby" size={36} />
            Stand By
          </button>
          <button type="button" className="power-btn" onClick={onTurnOff}>
            <Icon name="power" size={36} />
            Turn Off
          </button>
          <button type="button" className="power-btn" onClick={onRestart}>
            <Icon name="restart" size={36} />
            Restart
          </button>
        </div>
        <footer>
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        </footer>
      </dialog>
    </div>
  )
}
