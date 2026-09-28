import { useReadContract } from 'wagmi'
import { remyAbi, vaultAbi } from '../abis'
import { ADDR, LINKS, NEW } from '../config'
import type { AppProps } from '../os/apps'
import { Icon, RemyFlag } from '../os/icons'

const NEWS = [
  {
    id: 'trader',
    icon: 'trader',
    title: 'Remy Trader',
    text: 'A trading terminal for the fREMY/ETH pool: live tape, depth ladder, an order ticket, and a Market Maker desk to provide liquidity and collect fees.',
  },
  {
    id: 'recovery',
    icon: 'recovery',
    title: 'Recovery Center',
    text: 'Wallets hit by the Payment Processor exploit can revoke the bad approval and claim re-minted Remys with the same art.',
  },
  {
    id: 'vault',
    icon: 'vault',
    title: 'Remy Vault',
    text: 'A new vault backed 1:1 by Remys. Every fREMY redeems any Remy in the vault, and the fREMY/ETH pool lets you buy the floor with ETH.',
  },
  { id: 'legacy', icon: 'exchange', title: 'Legacy Exchange', text: 'rbREMY, staked rbREMYLS and wREMY convert into fREMY at the fixed old rates.' },
  { id: 'approvals', icon: 'approvals', title: 'Approvals Manager', text: 'Check which marketplaces can move your Remys and revoke them in one click.' },
]

export function Welcome({ navigate }: AppProps) {
  const { data: supply } = useReadContract({ address: ADDR.remy, abi: remyAbi, functionName: 'totalSupply' })
  const { data: inv } = useReadContract({
    address: NEW.vault,
    abi: vaultAbi,
    functionName: 'inventoryCount',
  })

  return (
    <div className="welcome scroll">
      <header className="wel-banner">
        <RemyFlag size={64} />
        <div>
          <h1>
            Welcome to Remy OS <i>xp</i>
          </h1>
          <p>Home of the Based Remy Boys on Base</p>
        </div>
      </header>
      <div className="wel-body">
        <aside className="wel-side">
          <figure className="photo">
            <img src="/images/Character2069.webp" alt="Remy Boy #2069, green hair, holding a baguette" width={600} height={600} />
            <figcaption>Remy Boy #2069</figcaption>
          </figure>
          <dl className="kv wel-stats">
            <dt>Tokens minted</dt>
            <dd>{supply !== undefined ? supply.toLocaleString() : '…'}</dd>
            <dt>In the vault</dt>
            <dd>{inv !== undefined ? inv.toString() : '…'}</dd>
            <dt>Network</dt>
            <dd>Base</dd>
          </dl>
        </aside>
        <main className="wel-main">
          <p className="lead">
            4,490 hand-drawn Remys living on Base. A community collection that outlived its mint, its marketplace and one exploit, and is still here.
          </p>
          <h2 className="wel-h">What's new</h2>
          <ul className="wel-news">
            {NEWS.map((n) => (
              <li key={n.id}>
                <button type="button" className="wel-item" onClick={() => navigate(n.id)}>
                  <Icon name={n.icon} size={32} />
                  <span>
                    <b>{n.title}</b>
                    <small>{n.text}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <h2 className="wel-h">Find Remy Boys online</h2>
          <div className="wel-links">
            {LINKS.map((l) => (
              <a key={l.href} className="wel-link" href={l.href} target="_blank" rel="noreferrer">
                <Icon name="globe" size={16} />
                {l.label}
              </a>
            ))}
          </div>
          <p className="muted small">
            Collection contract <span className="mono">{ADDR.remy}</span>
          </p>
        </main>
      </div>
    </div>
  )
}
