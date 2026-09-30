import { useState } from 'react'
import type { Address } from 'viem'
import { useAccount } from 'wagmi'
import { LINKS } from '../config'
import { shortAddr } from '../lib/format'
import { remyImg } from '../lib/media'
import { useVisibleApps } from './apps'
import { FlagMark, Icon } from './icons'
import { useWalletRemy } from './system'

export const GUEST_ART = 2069

/** XP user picture: the connected wallet's first Remy, the flag for a wallet without Remys, or the guest Remy. */
export function UserPicture({ address, size = 48 }: { address?: Address; size?: number }) {
  const { art } = useWalletRemy(address)
  if (address && art === undefined)
    return (
      <span className="user-pic icon-pic" style={{ width: size, height: size }}>
        <FlagMark size={Math.round(size * 0.7)} />
      </span>
    )
  return (
    <span className="user-pic" style={{ width: size, height: size }}>
      <img {...remyImg(art ?? GUEST_ART, `${size}px`)} alt="" />
    </span>
  )
}

const PINNED = ['vault', 'recovery']

type Props = { onLaunch: (id: string) => void; onLogOff: () => void; onTurnOff: () => void }

export function StartMenu({ onLaunch, onLogOff, onTurnOff }: Props) {
  const { address } = useAccount()
  const { id: firstId } = useWalletRemy(address)
  const [all, setAll] = useState(false)
  const visible = useVisibleApps()
  const pinned = visible.filter((a) => PINNED.includes(a.id))
  const rest = visible.filter((a) => !PINNED.includes(a.id))

  return (
    <div className="start-menu" role="menu" aria-label="Start menu">
      <header className="sm-head">
        <UserPicture address={address} />
        <span className="sm-user">{address ? shortAddr(address) : 'Guest'}</span>
      </header>
      <div className="sm-cols">
        <div className="sm-left">
          {pinned.map((a) => (
            <button type="button" role="menuitem" key={a.id} className="sm-item big" onClick={() => onLaunch(a.id)}>
              <Icon name={a.icon} size={32} />
              <span>
                <b>{a.title}</b>
                <small>{a.desc}</small>
              </span>
            </button>
          ))}
          <hr />
          {rest.map((a) => (
            <button type="button" role="menuitem" key={a.id} className="sm-item" onClick={() => onLaunch(a.id)}>
              <Icon name={a.icon} size={32} />
              <span>{a.title}</span>
            </button>
          ))}
          <div className="sm-spacer" />
          <hr />
          <div className="sm-all" onMouseLeave={() => setAll(false)}>
            <button
              type="button"
              role="menuitem"
              className="sm-item all"
              aria-expanded={all}
              onClick={() => setAll((v) => !v)}
              onMouseEnter={() => setAll(true)}
            >
              <b>All Programs</b>
              <span className="sm-all-arrow" aria-hidden="true" />
            </button>
            {all && (
              <div className="sm-flyout" role="menu">
                {visible.map((a) => (
                  <button type="button" role="menuitem" key={a.id} className="fly-item" onClick={() => onLaunch(a.id)}>
                    <Icon name={a.icon} size={16} />
                    {a.title}
                  </button>
                ))}
                <hr />
                {LINKS.map((l) => (
                  <a key={l.href} role="menuitem" className="fly-item" href={l.href} target="_blank" rel="noreferrer">
                    <Icon name="globe" size={16} />
                    {l.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="sm-right">
          <button type="button" role="menuitem" className="sm-place bold" onClick={() => onLaunch(firstId !== undefined ? `gallery/${firstId}` : 'gallery')}>
            <Icon name="gallery" size={24} />
            My Remys
          </button>
          <button type="button" role="menuitem" className="sm-place bold" onClick={() => onLaunch('vault')}>
            <Icon name="coin" size={24} />
            fREMY &amp; Vault
          </button>
          <hr />
          {LINKS.map((l) => (
            <a key={l.href} role="menuitem" className="sm-place" href={l.href} target="_blank" rel="noreferrer">
              <Icon name="globe" size={24} />
              {l.label}
            </a>
          ))}
          <hr />
          <button type="button" role="menuitem" className="sm-place" onClick={() => onLaunch('display')}>
            <Icon name="display" size={24} />
            Display Properties
          </button>
          <button type="button" role="menuitem" className="sm-place" onClick={() => onLaunch('welcome')}>
            <Icon name="help" size={24} />
            Help and Support
          </button>
        </div>
      </div>
      <footer className="sm-foot">
        <button type="button" role="menuitem" className="sm-power" onClick={onLogOff}>
          <Icon name="logoff" size={22} />
          {address ? 'Log Off' : 'Log On'}
        </button>
        <button type="button" role="menuitem" className="sm-power" onClick={onTurnOff}>
          <Icon name="power" size={22} />
          Turn Off Computer
        </button>
      </footer>
    </div>
  )
}
