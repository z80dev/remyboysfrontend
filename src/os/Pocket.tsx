import { type ReactNode, useCallback, useState } from 'react'
import { useAccount } from 'wagmi'
import { LINKS } from '../config'
import { useDataSnapshot } from '../lib/data'
import { shortAddr } from '../lib/format'
import { usePoolState } from '../lib/launch'
import { halloweenSrc } from '../lib/media'
import { BalloonHost } from './Balloons'
import { HalloweenMint, VISIT_HALLOWEEN } from './Halloween'
import { UserPicture } from './StartMenu'
import { WalletPanel, useClock, useOutside } from './Taskbar'
import { appById, useVisibleApps } from './apps'
import { FlagMark, Icon } from './icons'
import { useShell } from './shell'
import { useSecurityState } from './system'

type Props = {
  active?: string
  open: string[]
  onLaunch: (id: string) => void
  onClose: (id: string) => void
  onToday: () => void
  onLogOff: () => void
  children: ReactNode
}

/**
 * Pocket PC shell for phones: Luna title strip on top (Start, app title, tray, clock, ok),
 * a full-screen app or the Today screen, and a soft-key bar at the bottom.
 */
export function Pocket({ active, open, onLaunch, onClose, onToday, onLogOff, children }: Props) {
  const [start, setStart] = useState(false)
  const [wallet, setWallet] = useState(false)
  const closeStart = useCallback(() => setStart(false), [])
  const closeWallet = useCallback(() => setWallet(false), [])
  const startRef = useOutside<HTMLDivElement>(start, closeStart)
  const walletRef = useOutside<HTMLDivElement>(wallet, closeWallet)
  const { address } = useAccount()
  const apps = useVisibleApps()
  const now = useClock()
  const app = active ? appById(active) : undefined

  return (
    <div className="pocket">
      <header className="pk-top">
        <div className="pk-start" ref={startRef}>
          <button type="button" className={`pk-start-btn${start ? ' open' : ''}`} aria-label="Start" aria-expanded={start} onClick={() => setStart((s) => !s)}>
            <FlagMark size={22} />
          </button>
          {start && (
            <div className="pk-menu" role="menu">
              <div className="pk-menu-user">
                <UserPicture address={address} size={36} />
                <b>{address ? shortAddr(address) : 'Guest'}</b>
              </div>
              <button
                type="button"
                role="menuitem"
                className="pk-menu-item"
                onClick={() => {
                  closeStart()
                  onToday()
                }}
              >
                <Icon name="computer" size={24} />
                Today
              </button>
              <hr />
              {apps.map((a) => (
                <button
                  type="button"
                  role="menuitem"
                  key={a.id}
                  className="pk-menu-item"
                  onClick={() => {
                    closeStart()
                    onLaunch(a.id)
                  }}
                >
                  <Icon name={a.icon} size={24} />
                  {a.title}
                </button>
              ))}
              <hr />
              <button
                type="button"
                role="menuitem"
                className="pk-menu-item"
                onClick={() => {
                  closeStart()
                  onLaunch('display')
                }}
              >
                <Icon name="display" size={24} />
                Display Properties
              </button>
              <button
                type="button"
                role="menuitem"
                className="pk-menu-item"
                onClick={() => {
                  closeStart()
                  onLogOff()
                }}
              >
                <Icon name="logoff" size={24} />
                {address ? 'Log Off' : 'Log On'}
              </button>
            </div>
          )}
        </div>
        <h1 className="pk-title">{app ? app.title : 'Remy OS'}</h1>
        <span className="pk-tray" aria-hidden="true">
          <Icon name="network" size={16} />
          <span className={`pk-dot${address ? ' on' : ''}`} />
        </span>
        <time className="pk-clock">{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
        {app && (
          <button type="button" className="pk-ok" onClick={() => onClose(app.id)} aria-label={`Close ${app.title}`}>
            ok
          </button>
        )}
        <BalloonHost />
      </header>

      <main className="pk-body">{children ?? <Today onLaunch={onLaunch} onWallet={() => setWallet(true)} />}</main>

      <nav className="pk-keys" aria-label="Soft keys">
        <button type="button" className="pk-key" onClick={onToday} aria-current={!active ? 'page' : undefined}>
          Today
        </button>
        <div className="pk-running">
          {open.map((id) => {
            const a = appById(id)
            return a ? (
              <button type="button" key={id} className={`pk-run${id === active ? ' on' : ''}`} aria-label={a.title} onClick={() => onLaunch(id)}>
                <Icon name={a.icon} size={22} />
              </button>
            ) : null
          })}
        </div>
        <div className="pk-wallet" ref={walletRef}>
          <button type="button" className="pk-key" onClick={() => setWallet((w) => !w)} aria-expanded={wallet}>
            {address ? shortAddr(address) : 'Connect'}
          </button>
          {wallet && (
            <dialog open className="pk-sheet" aria-label="Wallet">
              <div className="tray-pop-title">
                <Icon name="wallet" size={16} /> Wallet
              </div>
              <WalletPanel onDone={closeWallet} />
            </dialog>
          )}
        </div>
      </nav>
    </div>
  )
}

function TodayRow({ icon, title, text, tone, onClick }: { icon: string; title: string; text: string; tone?: 'bad' | 'ok' | 'warn'; onClick: () => void }) {
  return (
    <button type="button" className={`today-row${tone ? ` ${tone}` : ''}`} onClick={onClick}>
      <Icon name={icon} size={32} />
      <span>
        <b>{title}</b>
        <small>{text}</small>
      </span>
    </button>
  )
}

/** Pocket PC "Today" screen: date, owner, live status plug-ins and the program list. */
function Today({ onLaunch, onWallet }: { onLaunch: (id: string) => void; onWallet: () => void }) {
  const { address } = useAccount()
  const apps = useVisibleApps()
  const sec = useSecurityState()
  const now = useClock()
  const { data } = useDataSnapshot()
  const inv = data ? BigInt(data.stats.inventory) : undefined
  const pool = usePoolState()
  const wallpaper = useShell((s) => s.prefs.wallpaper)

  const recovery = !address
    ? { tone: undefined, text: 'Connect to check for stolen Remys' }
    : !sec
      ? { tone: undefined, text: 'Checking this wallet…' }
      : sec.remaining > 0
        ? {
            tone: 'warn' as const,
            text: `${sec.remaining} Remy${sec.remaining === 1 ? '' : 's'} to reclaim · claims ${sec.claimsOpen ? 'open' : 'not open yet'}`,
          }
        : sec.owed > 0
          ? { tone: 'ok' as const, text: 'All re-mints claimed' }
          : { tone: 'ok' as const, text: 'Nothing to reclaim' }

  return (
    <div
      className="today"
      style={
        wallpaper.kind === 'halloween'
          ? {
              backgroundImage: `linear-gradient(rgba(18, 6, 31, 0.35), rgba(18, 6, 31, 0.75)), url(${halloweenSrc(wallpaper.art ?? VISIT_HALLOWEEN)})`,
              backgroundPosition: 'center top',
            }
          : undefined
      }
    >
      <div className="today-date">
        <FlagMark size={28} />
        <span>
          <b>{now.toLocaleDateString([], { weekday: 'long' })}</b>
          <small>{now.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</small>
        </span>
      </div>
      <button type="button" className="today-owner" onClick={address ? () => onLaunch('gallery') : onWallet}>
        <UserPicture address={address} size={44} />
        <span>
          <b>{address ? shortAddr(address) : 'Guest'}</b>
          <small>{address ? 'Connected to Base' : 'Tap to connect a wallet'}</small>
        </span>
      </button>
      <HalloweenMint pocket />
      <div className="today-list">
        <TodayRow icon="recovery" title="Recovery Center" text={recovery.text} tone={recovery.tone} onClick={() => onLaunch('recovery')} />
        <TodayRow
          icon={sec?.ppApproved ? 'shieldBad' : 'approvals'}
          title="Approvals"
          text={!address ? 'See who can move your Remys' : sec?.ppApproved ? 'Payment Processor can move your Remys' : 'No risky approval found'}
          tone={sec?.ppApproved ? 'bad' : undefined}
          onClick={() => onLaunch('approvals')}
        />
        <TodayRow
          icon="vault"
          title="Remy Vault"
          text={`${inv?.toString() ?? '…'} Remys in the vault · ${pool.live && pool.spot ? `floor ${pool.spot.toPrecision(3)} ETH` : 'pool opening soon'}`}
          onClick={() => onLaunch('vault')}
        />
      </div>
      <h2 className="today-h">Programs</h2>
      <div className="today-apps">
        {apps.map((a) => (
          <button type="button" key={a.id} className="today-app" onClick={() => onLaunch(a.id)}>
            <Icon name={a.icon} size={40} />
            <span>{a.short}</span>
          </button>
        ))}
      </div>
      <div className="today-links">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
            {l.label}
          </a>
        ))}
      </div>
    </div>
  )
}
