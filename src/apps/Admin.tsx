import { type ReactNode, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { ADMIN_API, EXPLORER } from '../config'
import { type LegacyKey, type Snapshot, useSnapshot } from '../lib/admin'
import { fmt, shortAddr } from '../lib/format'
import { isAdmin } from '../lib/launch'
import { ethPriceAtTick } from '../lib/v4math'
import type { AppProps } from '../os/apps'
import { Icon } from '../os/icons'
import { balloon, useIsMobile } from '../os/shell'
import { AppHeader, Badge, Banner, ConnectPrompt, Group, Loading, StatusBar } from '../os/ui'

const ATTACKER = '0x28bc445b674940c53c227b45d4405c34e60027ad'

/* --- formatting helpers -------------------------------------------------------------------------------- */

const n2 = (x: number, digits = 2) => x.toLocaleString('en-US', { maximumFractionDigits: digits })
const wei = (s: string, digits = 2) => fmt(BigInt(s), 18, digits)
const weiNum = (s: string) => Number(BigInt(s) / 10n ** 12n) / 1e6
const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0)

function age(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000))
  if (s < 90) return `${s}s ago`
  if (s < 5400) return `${Math.round(s / 60)} min ago`
  return `${(s / 3600).toFixed(1)} h ago`
}

/** Label for an address: the row's own label, then the snapshot's label map. */
const labelOf = (snap: Snapshot, address: string, own?: string) => own ?? snap.labels[address.toLowerCase()]

function Addr({ address, label, ens, contract }: { address: string; label?: string; ens?: string; contract?: boolean }) {
  return (
    <span className="adm-addr">
      {contract && (
        <span className="adm-contract" title="Contract (or an EIP-7702 delegated account)">
          <Icon name="computer" size={14} />
        </span>
      )}
      <a className="mono" href={`${EXPLORER}/address/${address}`} target="_blank" rel="noreferrer" title={address}>
        {shortAddr(address)}
      </a>
      {(label || ens) && <span className="adm-label">{label ?? ens}</span>}
    </span>
  )
}

/** XP share meter (solid green chunks) with the percentage beside it. */
function Meter({ value, label }: { value: number; label?: string }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <span className="adm-meter" title={`${v.toFixed(1)}%`}>
      <span className="adm-meter-bar">
        <i style={{ width: `${v}%` }} />
      </span>
      <span className="num">{label ?? `${v.toFixed(1)}%`}</span>
    </span>
  )
}

/* --- sortable XP list view ----------------------------------------------------------------------------- */

type Col<T> = {
  key: string
  label: string
  render: (row: T) => ReactNode
  /** Sort value; columns without one are not sortable. */
  sort?: (row: T) => number | string
  num?: boolean
  total?: ReactNode
}

function ListView<T>({
  rows,
  cols,
  rowKey,
  initial,
  empty = 'Nothing to show.',
}: { rows: T[]; cols: Col<T>[]; rowKey: (r: T) => string; initial?: string; empty?: string }) {
  const [sort, setSort] = useState<{ key: string; desc: boolean }>({ key: initial ?? '', desc: true })
  const sorted = useMemo(() => {
    const col = cols.find((c) => c.key === sort.key)
    if (!col?.sort) return rows
    const f = col.sort
    return [...rows].sort((a, b) => {
      const x = f(a)
      const y = f(b)
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
      return sort.desc ? -c : c
    })
  }, [rows, cols, sort])
  const hasTotals = cols.some((c) => c.total !== undefined)
  return (
    <div className="adm-lv-wrap">
      <table className="adm-lv">
        <thead>
          <tr>
            {cols.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={c.num ? 'num-col' : undefined}
                aria-sort={sort.key === c.key ? (sort.desc ? 'descending' : 'ascending') : undefined}
              >
                {c.sort ? (
                  <button
                    type="button"
                    onClick={() => setSort((s) => ({ key: c.key, desc: s.key === c.key ? !s.desc : typeof c.sort?.(rows[0] as T) === 'number' }))}
                  >
                    {c.label}
                    <span className={`adm-arrow${sort.key === c.key ? (sort.desc ? ' down' : ' up') : ''}`} aria-hidden="true" />
                  </button>
                ) : (
                  c.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={cols.length} className="adm-empty">
                {empty}
              </td>
            </tr>
          ) : (
            sorted.map((r) => (
              <tr key={rowKey(r)}>
                {cols.map((c) => (
                  <td key={c.key} className={c.num ? 'num-col' : undefined}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {hasTotals && (
          <tfoot>
            <tr>
              {cols.map((c) => (
                <td key={c.key} className={c.num ? 'num-col' : undefined}>
                  {c.total}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

/* --- export helpers ------------------------------------------------------------------------------------ */

function downloadCsv(name: string, header: string[], rows: (string | number | boolean | undefined)[][]) {
  const cell = (v: string | number | boolean | undefined) => {
    const s = v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [header, ...rows].map((r) => r.map(cell).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

async function copyAddresses(what: string, addresses: string[]) {
  try {
    await navigator.clipboard.writeText(addresses.join('\n'))
    balloon({ key: `copy-${Date.now()}`, icon: 'info', title: 'Copied to clipboard', text: `${addresses.length} ${what} addresses, one per line.` }, true)
  } catch {
    balloon(
      { key: `copy-${Date.now()}`, icon: 'warning', title: 'Could not copy', text: 'The browser blocked clipboard access. Use Export CSV instead.' },
      true,
    )
  }
}

/* --- tabs ---------------------------------------------------------------------------------------------- */

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="adm-stat">
      <small>{label}</small>
      <b className="num">{value}</b>
      {sub && <span>{sub}</span>}
    </div>
  )
}

function Completeness({ snap }: { snap: Snapshot }) {
  return (
    <div className="adm-badges">
      {Object.entries(snap.complete).map(([key, c]) => (
        <span key={key} title={`Verified ${wei(c.verifiedSum, 4)} of ${wei(c.supply, 4)} supply`}>
          <Badge tone={c.complete ? 'ok' : 'warn'}>
            {key}: {c.complete ? 'complete' : `${pct(weiNum(c.verifiedSum), weiNum(c.supply)).toFixed(1)}% verified`}
          </Badge>
        </span>
      ))}
    </div>
  )
}

function Overview({ snap, go }: { snap: Snapshot; go: (tab: Tab) => void }) {
  const owed = snap.recovery.victims.reduce((s, v) => s + v.owed, 0)
  const claimed = snap.recovery.victims.reduce((s, v) => s + v.claimed, 0)
  const contracts = snap.stuck.contracts
  return (
    <div className="adm-grid">
      <Group title="Remys stuck in old contracts" className="adm-wide">
        <div className="adm-hero">
          <Icon name="vault" size={48} />
          <div>
            <b className="num">{n2(snap.stuck.totalRemys, 0)}</b>
            <span>Remys held by legacy contracts, claimable through their tokens</span>
          </div>
          <Completeness snap={snap} />
        </div>
        <ListView
          rows={contracts}
          rowKey={(c) => c.address}
          initial="remys"
          cols={[
            { key: 'name', label: 'Contract', render: (c) => <b>{c.name}</b>, sort: (c) => c.name },
            { key: 'addr', label: 'Address', render: (c) => <Addr address={c.address} /> },
            { key: 'remys', label: 'Remys', num: true, render: (c) => n2(c.remys, 0), sort: (c) => c.remys },
            {
              key: 'share',
              label: 'Share',
              render: (c) => <Meter value={pct(c.remys, snap.stuck.totalRemys)} />,
              sort: (c) => c.remys,
            },
            {
              key: 'token',
              label: 'Claim token',
              render: (c) =>
                c.claimToken ? (
                  <a href={`${EXPLORER}/token/${c.claimToken.address}`} target="_blank" rel="noreferrer">
                    {c.claimToken.symbol}
                  </a>
                ) : (
                  <span className="muted">—</span>
                ),
            },
            { key: 'supply', label: 'Token supply', num: true, render: (c) => (c.claimToken ? wei(c.claimToken.supply) : '—') },
            { key: 'rate', label: 'Remys / token', num: true, render: (c) => (c.claimToken ? n2(c.claimToken.remysPerToken, 6) : '—') },
          ]}
        />
      </Group>
      <Group title="Remy Vault">
        <div className="adm-stats">
          <Stat label="Inventory" value={n2(snap.vault.inventory, 0)} sub="Remys" />
          <Stat label="Floor price" value={snap.vault.price.toPrecision(4)} sub="ETH per fREMY" />
          <Stat label="fREMY outside vault" value={wei(snap.vault.fremyOutsideVault)} sub={`of ${wei(snap.vault.fremySupply, 0)} supply`} />
          <Stat
            label="LP positions"
            value={snap.vault.lp.length}
            sub={
              <button type="button" className="linkish" onClick={() => go('vault')}>
                Vault &amp; LP
              </button>
            }
          />
        </div>
      </Group>
      <Group title="Recovery">
        <div className="adm-stats">
          <Stat label="Claims" value={snap.recovery.claimsEnabled ? 'Open' : 'Closed'} />
          <Stat label="Victims" value={snap.recovery.victims.length} />
        </div>
        <div className="adm-progress">
          <span>Re-minted</span>
          <Meter value={pct(claimed, owed)} label={`${claimed} / ${owed}`} />
          <span>Stolen still with attacker</span>
          <Meter
            value={pct(snap.recovery.stolenStillWithAttacker, snap.recovery.stolenTotal)}
            label={`${snap.recovery.stolenStillWithAttacker} / ${snap.recovery.stolenTotal}`}
          />
        </div>
      </Group>
      <Group title="Top 10 whales" className="adm-wide">
        <WhaleTable snap={snap} rows={snap.whales.slice(0, 10)} />
        <div className="row end">
          <button type="button" className="btn" onClick={() => go('whales')}>
            All {snap.whales.length} whales…
          </button>
        </div>
      </Group>
    </div>
  )
}

function WhaleTable({ snap, rows }: { snap: Snapshot; rows: Snapshot['whales'] }) {
  return (
    <ListView
      rows={rows}
      rowKey={(w) => w.address}
      initial="total"
      cols={[
        {
          key: 'who',
          label: 'Holder',
          render: (w) => <Addr address={w.address} label={labelOf(snap, w.address, w.label)} ens={w.ens} contract={w.isContract} />,
          sort: (w) => labelOf(snap, w.address, w.label) ?? w.ens ?? w.address,
        },
        { key: 'total', label: 'Total', num: true, render: (w) => <b>{n2(w.total)}</b>, sort: (w) => w.total },
        { key: 'nfts', label: 'NFTs', num: true, render: (w) => n2(w.nfts, 0), sort: (w) => w.nfts },
        { key: 'legacy', label: 'Legacy Remys', num: true, render: (w) => n2(w.legacyRemys), sort: (w) => w.legacyRemys },
        { key: 'fremy', label: 'fREMY', num: true, render: (w) => n2(w.fremy), sort: (w) => w.fremy },
        { key: 'lp', label: 'LP Remys', num: true, render: (w) => n2(w.lpRemys), sort: (w) => w.lpRemys },
      ]}
    />
  )
}

function Whales({ snap }: { snap: Snapshot }) {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const rows = needle
    ? snap.whales.filter((w) => [w.address, w.ens, labelOf(snap, w.address, w.label)].some((x) => x?.toLowerCase().includes(needle)))
    : snap.whales
  return (
    <>
      <div className="adm-toolbar">
        <label htmlFor="adm-search" className="sr-only">
          Search whales
        </label>
        <Icon name="search" size={16} />
        <input id="adm-search" className="input grow" placeholder="Search address, ENS or label" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="muted small">
          {rows.length} of {snap.whales.length}
        </span>
        <button
          type="button"
          className="btn"
          onClick={() =>
            downloadCsv(
              `remy-whales-${snap.block}.csv`,
              ['address', 'label', 'ens', 'total', 'nfts', 'legacyRemys', 'fremy', 'lpRemys', 'isContract'],
              rows.map((w) => [w.address, labelOf(snap, w.address, w.label), w.ens, w.total, w.nfts, w.legacyRemys, w.fremy, w.lpRemys, w.isContract]),
            )
          }
        >
          <Icon name="download" size={16} />
          Export CSV
        </button>
      </div>
      <WhaleTable snap={snap} rows={rows} />
    </>
  )
}

function LegacyHolders({ snap }: { snap: Snapshot }) {
  const [key, setKey] = useState<LegacyKey>(snap.legacy[0]?.key ?? 'rbREMYLS')
  const tok = snap.legacy.find((l) => l.key === key) ?? snap.legacy[0]
  if (!tok) return <Banner tone="info" icon="info" title="No legacy tokens in this snapshot" />
  const now = Date.now() / 1000
  const totalRemys = tok.holders.reduce((s, h) => s + h.remys, 0)
  const totalBal = tok.holders.reduce((s, h) => s + BigInt(h.balance), 0n)
  const c = snap.complete[tok.key]
  return (
    <>
      <div className="adm-toolbar" role="tablist" aria-label="Claim token">
        {snap.legacy.map((l) => (
          <button
            key={l.key}
            type="button"
            role="tab"
            aria-selected={l.key === key}
            className={`tool${l.key === key ? ' on' : ''}`}
            onClick={() => setKey(l.key)}
          >
            <Icon name={l.key === 'rbREMYLS' ? 'vault' : l.key === 'rbREMY' ? 'exchange' : 'coin'} size={20} />
            {l.symbol} <span className="muted">({l.holders.length})</span>
          </button>
        ))}
      </div>
      <div className="adm-stats">
        <Stat label="Supply" value={wei(tok.supply)} sub={tok.symbol} />
        <Stat label="Remys claimable" value={n2(totalRemys)} sub={`${n2(tok.remysPerToken, 6)} Remys per token`} />
        <Stat label="Holders" value={tok.holders.length} />
        <Stat
          label="Coverage"
          value={c ? (c.complete ? 'Complete' : `${pct(weiNum(c.verifiedSum), weiNum(c.supply)).toFixed(1)}%`) : '—'}
          sub={
            <a href={`${EXPLORER}/token/${tok.address}`} target="_blank" rel="noreferrer">
              Token on Basescan
            </a>
          }
        />
      </div>
      <div className="adm-toolbar">
        <span className="grow" />
        <button
          type="button"
          className="btn"
          onClick={() =>
            copyAddresses(
              tok.symbol,
              tok.holders.filter((h) => !h.isContract).map((h) => h.address),
            )
          }
          title="Wallet addresses only (contracts left out), for outreach"
        >
          Copy addresses
        </button>
        <button
          type="button"
          className="btn"
          onClick={() =>
            downloadCsv(
              `remy-${tok.key}-holders-${snap.block}.csv`,
              ['address', 'label', 'balance', 'remys', 'lockedUntil', 'isContract'],
              tok.holders.map((h) => [
                h.address,
                labelOf(snap, h.address, h.label),
                wei(h.balance, 6).replace(/,/g, ''),
                h.remys,
                h.lockedUntil ? new Date(h.lockedUntil * 1000).toISOString() : '',
                h.isContract,
              ]),
            )
          }
        >
          <Icon name="download" size={16} />
          Export CSV
        </button>
      </div>
      <ListView
        key={tok.key}
        rows={tok.holders}
        rowKey={(h) => h.address}
        initial="remys"
        cols={[
          {
            key: 'who',
            label: 'Holder',
            render: (h) => <Addr address={h.address} label={labelOf(snap, h.address, h.label)} contract={h.isContract} />,
            sort: (h) => labelOf(snap, h.address, h.label) ?? h.address,
            total: <b>Total ({tok.holders.length})</b>,
          },
          {
            key: 'bal',
            label: `${tok.symbol} balance`,
            num: true,
            render: (h) => wei(h.balance, 4),
            sort: (h) => weiNum(h.balance),
            total: <b>{fmt(totalBal, 18, 2)}</b>,
          },
          { key: 'remys', label: 'Remys', num: true, render: (h) => n2(h.remys, 3), sort: (h) => h.remys, total: <b>{n2(totalRemys, 3)}</b> },
          { key: 'share', label: 'Share', render: (h) => <Meter value={pct(h.remys, totalRemys)} />, sort: (h) => h.remys },
          ...(tok.key === 'rbREMYLS'
            ? [
                {
                  key: 'lock',
                  label: 'Locked until',
                  render: (h: (typeof tok.holders)[number]) =>
                    h.lockedUntil && h.lockedUntil > now ? (
                      <Badge tone="warn">{new Date(h.lockedUntil * 1000).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</Badge>
                    ) : (
                      <span className="muted">unlocked</span>
                    ),
                  sort: (h: (typeof tok.holders)[number]) => h.lockedUntil ?? 0,
                },
              ]
            : []),
        ]}
      />
    </>
  )
}

function Collection({ snap }: { snap: Snapshot }) {
  const c = snap.collection
  const topN = (n: number) => c.top.slice(0, n).reduce((s, h) => s + h.nfts, 0)
  return (
    <>
      <div className="adm-stats">
        <Stat label="Total supply" value={n2(c.totalSupply, 0)} sub="Remy Boys NFTs" />
        <Stat label="Holders" value={n2(c.holderCount, 0)} sub={`${(c.totalSupply / Math.max(1, c.holderCount)).toFixed(1)} per holder`} />
        <div className="adm-stat">
          <small>Top 10 hold</small>
          <Meter value={pct(topN(10), c.totalSupply)} label={`${topN(10)} · ${pct(topN(10), c.totalSupply).toFixed(1)}%`} />
          <small>Top 50 hold</small>
          <Meter value={pct(topN(50), c.totalSupply)} label={`${topN(50)} · ${pct(topN(50), c.totalSupply).toFixed(1)}%`} />
        </div>
      </div>
      <ListView
        rows={c.top.map((h, i) => ({ ...h, rank: i + 1 }))}
        rowKey={(h) => h.address}
        initial="nfts"
        cols={[
          { key: 'rank', label: '#', num: true, render: (h) => h.rank, sort: (h) => h.rank },
          {
            key: 'who',
            label: 'Holder',
            render: (h) => <Addr address={h.address} label={labelOf(snap, h.address, h.label)} contract={h.isContract} />,
            sort: (h) => labelOf(snap, h.address, h.label) ?? h.address,
          },
          { key: 'nfts', label: 'NFTs', num: true, render: (h) => h.nfts, sort: (h) => h.nfts },
          { key: 'share', label: 'Share of supply', render: (h) => <Meter value={pct(h.nfts, c.totalSupply)} />, sort: (h) => h.nfts },
        ]}
      />
    </>
  )
}

function VaultLp({ snap }: { snap: Snapshot }) {
  const v = snap.vault
  const supply = weiNum(v.fremySupply)
  return (
    <>
      <div className="adm-stats">
        <Stat label="Inventory" value={n2(v.inventory, 0)} sub="Remys in the vault" />
        <Stat label="Reserve" value={wei(v.reserve)} sub="fREMY" />
        <Stat label="Outside vault" value={wei(v.fremyOutsideVault)} sub={`of ${wei(v.fremySupply, 0)} fREMY`} />
        <Stat label="Price" value={v.price.toPrecision(4)} sub="ETH per fREMY" />
      </div>
      <h2 className="section-h">LP positions ({v.lp.length})</h2>
      <ListView
        rows={v.lp}
        rowKey={(p) => p.tokenId}
        initial="fremy"
        empty="No liquidity positions in the fREMY/ETH pool."
        cols={[
          {
            key: 'id',
            label: 'Position',
            render: (p) => (
              <a href={`https://app.uniswap.org/positions/v4/base/${p.tokenId}`} target="_blank" rel="noreferrer">
                #{p.tokenId}
              </a>
            ),
            sort: (p) => Number(p.tokenId),
          },
          {
            key: 'owner',
            label: 'Owner',
            render: (p) => <Addr address={p.owner} label={labelOf(snap, p.owner, p.label)} />,
            sort: (p) => labelOf(snap, p.owner, p.label) ?? p.owner,
          },
          {
            key: 'range',
            label: 'Range (ETH / fREMY)',
            render: (p) => (
              <span className="num">
                {ethPriceAtTick(p.tickUpper).toPrecision(4)} – {ethPriceAtTick(p.tickLower).toPrecision(4)}
              </span>
            ),
            sort: (p) => -p.tickUpper,
          },
          { key: 'fremy', label: 'fREMY', num: true, render: (p) => wei(p.fremy, 4), sort: (p) => weiNum(p.fremy) },
          { key: 'eth', label: 'ETH', num: true, render: (p) => wei(p.eth, 6), sort: (p) => weiNum(p.eth) },
          {
            key: 'in',
            label: 'Status',
            render: (p) => <Badge tone={p.inRange ? 'ok' : 'info'}>{p.inRange ? 'in range' : 'out of range'}</Badge>,
            sort: (p) => (p.inRange ? 1 : 0),
          },
        ]}
      />
      <h2 className="section-h">fREMY holders ({v.fremyHolders.length})</h2>
      <ListView
        rows={v.fremyHolders}
        rowKey={(h) => h.address}
        initial="bal"
        cols={[
          {
            key: 'who',
            label: 'Holder',
            render: (h) => <Addr address={h.address} label={labelOf(snap, h.address, h.label)} />,
            sort: (h) => labelOf(snap, h.address, h.label) ?? h.address,
          },
          { key: 'bal', label: 'fREMY', num: true, render: (h) => wei(h.balance, 4), sort: (h) => weiNum(h.balance) },
          { key: 'share', label: 'Share of supply', render: (h) => <Meter value={pct(weiNum(h.balance), supply)} />, sort: (h) => weiNum(h.balance) },
        ]}
      />
    </>
  )
}

function RecoveryTab({ snap }: { snap: Snapshot }) {
  const r = snap.recovery
  const owed = r.victims.reduce((s, v) => s + v.owed, 0)
  const claimed = r.victims.reduce((s, v) => s + v.claimed, 0)
  return (
    <>
      <div className="adm-stats">
        <Stat label="Claims" value={r.claimsEnabled ? 'Open' : 'Closed'} sub="RemyReclaim minting" />
        <Stat label="Victims" value={r.victims.length} sub={`${r.victims.filter((v) => v.claimed >= v.owed).length} fully recovered`} />
        <div className="adm-stat">
          <small>Re-minted</small>
          <Meter value={pct(claimed, owed)} label={`${claimed} / ${owed}`} />
        </div>
        <div className="adm-stat">
          <small>Stolen still with attacker</small>
          <Meter value={pct(r.stolenStillWithAttacker, r.stolenTotal)} label={`${r.stolenStillWithAttacker} / ${r.stolenTotal}`} />
          <Addr address={ATTACKER} label={labelOf(snap, ATTACKER)} />
        </div>
      </div>
      <ListView
        rows={r.victims}
        rowKey={(v) => v.address}
        initial="owed"
        cols={[
          { key: 'who', label: 'Victim', render: (v) => <Addr address={v.address} label={labelOf(snap, v.address)} />, sort: (v) => v.address },
          { key: 'owed', label: 'Owed', num: true, render: (v) => v.owed, sort: (v) => v.owed, total: <b>{owed}</b> },
          { key: 'claimed', label: 'Claimed', num: true, render: (v) => v.claimed, sort: (v) => v.claimed, total: <b>{claimed}</b> },
          { key: 'left', label: 'Remaining', num: true, render: (v) => v.owed - v.claimed, sort: (v) => v.owed - v.claimed, total: <b>{owed - claimed}</b> },
          { key: 'prog', label: 'Progress', render: (v) => <Meter value={pct(v.claimed, v.owed)} />, sort: (v) => pct(v.claimed, v.owed) },
        ]}
      />
    </>
  )
}

/* --- shell --------------------------------------------------------------------------------------------- */

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'admin' },
  { id: 'whales', label: 'Whales', icon: 'coin' },
  { id: 'legacy', label: 'Legacy holders', icon: 'exchange' },
  { id: 'collection', label: 'Collection', icon: 'gallery' },
  { id: 'vault', label: 'Vault & LP', icon: 'vault' },
  { id: 'recovery', label: 'Recovery', icon: 'recovery' },
] as const
type Tab = (typeof TABS)[number]['id']

export function Admin({ param, navigate, close }: AppProps) {
  const { address } = useAccount()
  const mobile = useIsMobile()
  const admin = isAdmin(address)
  const tab: Tab = TABS.some((t) => t.id === param) ? (param as Tab) : 'overview'
  const snap = useSnapshot()

  if (!admin)
    return (
      <div className="app-col adm-denied">
        <section className="adm-denied-box" role="alertdialog" aria-labelledby="adm-denied-title">
          <header className="tray-pop-title" id="adm-denied-title">
            <Icon name="admin" size={16} /> Remy Admin
          </header>
          <div className="adm-denied-body">
            <div className="msg-body">
              <Icon name="approvals" size={48} />
              <div>
                <h2>Administrator access required</h2>
                <p>Remy Admin is for the Remy Boys team. Connect an administrator wallet to open it.</p>
              </div>
            </div>
            {!address && <ConnectPrompt why="Connect an administrator wallet." title="Log on as administrator" />}
            <div className="row end">
              <button type="button" className="btn default" onClick={close}>
                OK
              </button>
            </div>
          </div>
        </section>
      </div>
    )

  const s = snap.data
  return (
    <div className="app-col adm">
      {!mobile && <AppHeader icon="admin" title="Remy Admin" sub="Holders, whales, stuck Remys and recovery, indexed from Base" />}
      <div className="adm-bar">
        <div className="tabs adm-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? 'on' : ''}
              onClick={() => navigate(`admin/${t.id}`)}
            >
              <Icon name={t.icon} size={16} />
              {t.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn adm-refresh" disabled={snap.isFetching} onClick={() => snap.refetch()} aria-label="Refresh snapshot">
          <Icon name="restart" size={16} />
          {!mobile && (snap.isFetching ? 'Refreshing…' : 'Refresh')}
        </button>
      </div>
      <div className="tab-panel adm-panel scroll">
        {snap.error && !s ? (
          <div className="adm-error">
            <Banner tone="bad" icon="error" title="The admin index could not be reached">
              {(snap.error as Error).message}. API: <code>{ADMIN_API}</code>
            </Banner>
            <button type="button" className="btn" onClick={() => snap.refetch()}>
              Try again
            </button>
          </div>
        ) : !s ? (
          <Loading>Loading the admin snapshot…</Loading>
        ) : (
          <>
            {snap.error && (
              <Banner tone="warn" icon="warning" title="Showing the last snapshot">
                Refresh failed: {(snap.error as Error).message}
              </Banner>
            )}
            {tab === 'overview' ? (
              <Overview snap={s} go={(t) => navigate(`admin/${t}`)} />
            ) : tab === 'whales' ? (
              <Whales snap={s} />
            ) : tab === 'legacy' ? (
              <LegacyHolders snap={s} />
            ) : tab === 'collection' ? (
              <Collection snap={s} />
            ) : tab === 'vault' ? (
              <VaultLp snap={s} />
            ) : (
              <RecoveryTab snap={s} />
            )}
          </>
        )}
      </div>
      <StatusBar busy={snap.isFetching} right={s ? `Block ${s.block.toLocaleString()}` : undefined}>
        {s ? `Snapshot ${new Date(s.generatedAt).toLocaleString()} · ${age(s.generatedAt)}` : snap.error ? 'Index unreachable' : 'Connecting to the index…'}
      </StatusBar>
    </div>
  )
}
