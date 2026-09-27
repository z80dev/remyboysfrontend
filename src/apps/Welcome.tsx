import { useReadContract } from 'wagmi'
import { remyAbi, vaultAbi } from '../abis'
import { ADDR, LINKS, NEW } from '../config'
import type { AppProps } from '../os/apps'
import { Group } from '../os/ui'

export function Welcome({ navigate }: AppProps) {
  const { data: supply } = useReadContract({ address: ADDR.remy, abi: remyAbi, functionName: 'totalSupply' })
  const { data: inv } = useReadContract({
    address: NEW.vault,
    abi: vaultAbi,
    functionName: 'inventoryCount',
    query: { enabled: !!NEW.vault },
  })

  return (
    <div className="pad welcome">
      <div className="hero">
        <img className="hero-art" src="/images/Character2069.webp" alt="A Remy Boy" />
        <div>
          <h1>Remy Boys</h1>
          <p className="lead">
            4,490 hand-drawn Remys living on Base. A community collection that outlived its mint, its marketplace and one exploit, and is still
            here.
          </p>
          <div className="stats">
            <div>
              <b>{supply !== undefined ? supply.toLocaleString() : '…'}</b>
              <span>tokens minted</span>
            </div>
            <div>
              <b>{NEW.vault ? (inv !== undefined ? inv.toString() : '…') : 'soon'}</b>
              <span>Remys in the vault</span>
            </div>
            <div>
              <b>Base</b>
              <span>network</span>
            </div>
          </div>
        </div>
      </div>

      <Group title="What's new">
        <ul className="news">
          <li>
            <button type="button" className="linkish" onClick={() => navigate('recovery')}>
              Recovery Center
            </button>{' '}
            — wallets hit by the Payment Processor exploit can revoke the bad approval and claim re-minted Remys with the same art.
          </li>
          <li>
            <button type="button" className="linkish" onClick={() => navigate('vault')}>
              Remy Vault
            </button>{' '}
            — a new vault backed 1:1 by Remys. Every fREMY redeems any Remy in the vault, and the fREMY/ETH pool lets you buy the floor with
            ETH.
          </li>
          <li>
            <button type="button" className="linkish" onClick={() => navigate('legacy')}>
              Legacy Exchange
            </button>{' '}
            — rbREMY, staked rbREMYLS and wREMY convert into fREMY at the fixed old rates.
          </li>
          <li>
            <button type="button" className="linkish" onClick={() => navigate('approvals')}>
              Approvals Manager
            </button>{' '}
            — check which marketplaces can move your Remys and revoke in one click.
          </li>
        </ul>
      </Group>

      <Group title="Links">
        <div className="row wrap">
          {LINKS.map((l) => (
            <a key={l.href} className="btn" href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          ))}
        </div>
      </Group>
      <p className="muted small">
        Collection contract <span className="mono">{ADDR.remy}</span>
      </p>
    </div>
  )
}
