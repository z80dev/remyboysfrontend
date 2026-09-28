import { useEffect, useMemo, useState } from 'react'
import type { Address } from 'viem'
import { useAccount, useBalance, useReadContracts } from 'wagmi'
import { readContract } from 'wagmi/actions'
import { erc20Abi, remyAbi, routerAbi, vaultAbi } from '../abis'
import { ADDR, NEW } from '../config'
import { useArtIndexes } from '../lib/art'
import { deadline, fmt } from '../lib/format'
import { useOwnedIds } from '../lib/owned'
import { usePoolKey, useQuote, useSpotPrice } from '../lib/pool'
import type { TxStep } from '../lib/tx'
import type { AppProps } from '../os/apps'
import { Icon } from '../os/icons'
import { useIsMobile } from '../os/shell'
import { useTxUi } from '../os/system'
import { AddressBar, ComingSoon, ConnectPrompt, Loading, StatusBar, TaskBox, TaskLink, TaskPane, Thumb } from '../os/ui'
import { config } from '../wagmi'

const ONE = 10n ** 18n
const PAGE = 60

type Deployed = { vault: Address; fremy: Address; router?: Address }

function Grid({
  ids,
  selected,
  toggle,
  loading,
  empty,
}: { ids: bigint[]; selected: Set<bigint>; toggle: (id: bigint) => void; loading: boolean; empty: string }) {
  const { map } = useArtIndexes(ids)
  if (loading) return <Loading>Loading Remys…</Loading>
  if (!ids.length)
    return (
      <div className="empty-folder">
        <Icon name="folder" size={48} />
        <p>{empty}</p>
      </div>
    )
  return (
    <div className="thumbs">
      {ids.map((id) => (
        <Thumb key={id.toString()} index={map.get(id)} label={`#${id}`} selected={selected.has(id)} onClick={() => toggle(id)} />
      ))}
    </div>
  )
}

function Pager({ page, pages, set }: { page: number; pages: number; set: (p: number) => void }) {
  if (pages <= 1) return null
  return (
    <div className="pager">
      <button type="button" className="tool icon-only" disabled={page === 0} onClick={() => set(page - 1)} aria-label="Previous page">
        <Icon name="back" size={24} />
      </button>
      <span className="small">
        Page {page + 1} of {pages}
      </span>
      <button type="button" className="tool icon-only" disabled={page >= pages - 1} onClick={() => set(page + 1)} aria-label="Next page">
        <Icon name="forward" size={24} />
      </button>
    </div>
  )
}

function VaultInner({ vault, fremy, router, navigate }: Deployed & { navigate: (h: string) => void }) {
  const { address } = useAccount()
  const mobile = useIsMobile()
  const tx = useTxUi()
  const [tab, setTab] = useState<'buy' | 'sell'>('buy')
  const [page, setPage] = useState(0)
  const [myPage, setMyPage] = useState(0)
  const [selected, setSelected] = useState<Set<bigint>>(new Set())
  // biome-ignore lint/correctness/useExhaustiveDependencies: switching folders clears the selection
  useEffect(() => setSelected(new Set()), [tab])

  const { data: stats } = useReadContracts({
    contracts: [
      { address: vault, abi: vaultAbi, functionName: 'inventoryCount' },
      { address: vault, abi: vaultAbi, functionName: 'maxBatch' },
      { address: fremy, abi: erc20Abi, functionName: 'balanceOf', args: [address ?? vault] },
    ],
    allowFailure: false,
  })
  const [invCount, maxBatchBig, fremyBal] = stats ?? []
  const maxBatch = Number(maxBatchBig ?? 100n)
  const { data: ethBal } = useBalance({ address, query: { enabled: !!address } })

  const inv = useOwnedIds(vault, page, PAGE)
  const mine = useOwnedIds(tab === 'sell' ? address : undefined, myPage, PAGE)

  const key = usePoolKey(router)
  const spot = useSpotPrice(key)
  const n = BigInt(selected.size)
  const quote = useQuote(key, tab, n * ONE)
  const quoted = quote.data?.[0]

  const toggle = (id: bigint) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else if (next.size < maxBatch) next.add(id)
      else tx.setStatus({ msg: `Up to ${maxBatch} Remys per transaction.`, error: true })
      return next
    })

  const ids = useMemo(() => [...selected], [selected])
  const me = address as Address
  const done = (ok: boolean) => ok && setSelected(new Set())

  const nftApproval = (operator: Address): TxStep => ({
    label: 'Approve Remys',
    request: async () =>
      (await readContract(config, { address: ADDR.remy, abi: remyAbi, functionName: 'isApprovedForAll', args: [me, operator] }))
        ? null
        : { address: ADDR.remy, abi: remyAbi, functionName: 'setApprovalForAll', args: [operator, true] },
  })

  const buy = async () => {
    if (!router || !quoted) return
    const value = (quoted * 102n) / 100n // 2% slippage headroom; the router refunds unused ETH
    done(
      await tx.run([
        {
          label: `Buy ${ids.length} Remy${ids.length === 1 ? '' : 's'}`,
          request: { address: router, abi: routerAbi, functionName: 'buyNFTs', args: [ids, me, deadline()], value },
        },
      ]),
    )
  }
  const redeem = async () => {
    const amount = n * ONE
    done(
      await tx.run([
        {
          label: 'Approve fREMY',
          request: async () =>
            (await readContract(config, { address: fremy, abi: erc20Abi, functionName: 'allowance', args: [me, vault] })) >= amount
              ? null
              : { address: fremy, abi: erc20Abi, functionName: 'approve', args: [vault, amount] },
        },
        {
          label: `Redeem ${ids.length} Remy${ids.length === 1 ? '' : 's'}`,
          request: { address: vault, abi: vaultAbi, functionName: 'redeem', args: [ids, me] },
        },
      ]),
    )
  }
  const sell = async () => {
    if (!router || !quoted) return
    const minOut = (quoted * 98n) / 100n
    done(
      await tx.run([
        nftApproval(router),
        {
          label: `Sell ${ids.length} Remy${ids.length === 1 ? '' : 's'}`,
          request: { address: router, abi: routerAbi, functionName: 'sellNFTs', args: [ids, minOut, me, deadline()] },
        },
      ]),
    )
  }
  const deposit = async () =>
    done(
      await tx.run([
        nftApproval(vault),
        {
          label: `Deposit ${ids.length} Remy${ids.length === 1 ? '' : 's'}`,
          request: { address: vault, abi: vaultAbi, functionName: 'deposit', args: [ids, me] },
        },
      ]),
    )

  const canRedeem = fremyBal !== undefined && fremyBal >= n * ONE
  const quoteText =
    selected.size === 0
      ? tab === 'buy'
        ? 'Pick Remys from the vault.'
        : 'Pick Remys to sell or deposit.'
      : !router
        ? 'Pool opens soon.'
        : quote.isLoading
          ? 'Quoting…'
          : quoted
            ? tab === 'buy'
              ? `≈ ${fmt(quoted, 18, 5)} ETH`
              : `≈ ${fmt(quoted, 18, 5)} ETH out`
            : 'No pool liquidity for this size.'
  const nSel = selected.size
  const plural = nSel === 1 ? 'Remy' : 'Remys'
  const actions =
    tab === 'buy'
      ? [
          {
            key: 'buy',
            icon: 'eth',
            label: nSel ? `Buy ${nSel} ${plural} with ETH` : 'Buy selected with ETH',
            run: buy,
            disabled: tx.busy || !nSel || !quoted,
            primary: true,
          },
          {
            key: 'redeem',
            icon: 'coin',
            label: nSel ? `Redeem ${nSel} with fREMY` : 'Redeem selected with fREMY',
            run: redeem,
            disabled: tx.busy || !nSel || !canRedeem,
          },
        ]
      : [
          {
            key: 'sell',
            icon: 'eth',
            label: nSel ? `Sell ${nSel} ${plural} for ETH` : 'Sell selected for ETH',
            run: sell,
            disabled: tx.busy || !nSel || !quoted,
            primary: true,
          },
          { key: 'deposit', icon: 'coin', label: nSel ? `Deposit ${nSel} for fREMY` : 'Deposit selected for fREMY', run: deposit, disabled: tx.busy || !nSel },
        ]
  const pager = tab === 'buy' ? <Pager page={page} pages={inv.pages} set={setPage} /> : <Pager page={myPage} pages={mine.pages} set={setMyPage} />

  return (
    <>
      <div className="ex-toolbar" role="tablist" aria-label="Folders">
        <button type="button" role="tab" aria-selected={tab === 'buy'} className={`tool${tab === 'buy' ? ' on' : ''}`} onClick={() => setTab('buy')}>
          <Icon name="vault" size={24} />
          <span>Vault inventory{invCount !== undefined ? ` (${invCount})` : ''}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'sell'} className={`tool${tab === 'sell' ? ' on' : ''}`} onClick={() => setTab('sell')}>
          <Icon name="gallery" size={24} />
          <span>My Remys{address && mine.total ? ` (${mine.total})` : ''}</span>
        </button>
        <span className="grow" />
        {pager}
      </div>
      {!mobile && <AddressBar icon={tab === 'buy' ? 'vault' : 'gallery'} path={tab === 'buy' ? 'Remy Vault\\Inventory' : 'Remy Vault\\My Remys'} />}
      {mobile && (
        <div className="stat-strip">
          <span>
            <small>Floor</small>
            <b>{spot ? `${spot.toPrecision(3)} ETH` : router ? '—' : 'soon'}</b>
          </span>
          <span>
            <small>In vault</small>
            <b>{invCount?.toString() ?? '…'}</b>
          </span>
          <span>
            <small>fREMY</small>
            <b>{address ? fmt(fremyBal, 18, 4) : '—'}</b>
          </span>
        </div>
      )}
      <div className="split">
        {!mobile && (
          <TaskPane>
            <TaskBox title={tab === 'buy' ? 'Vault Tasks' : 'Selling Tasks'} primary>
              {address ? (
                actions.map((a) => (
                  <TaskLink key={a.key} icon={a.icon} onClick={a.run} disabled={a.disabled} strong={a.primary}>
                    {a.label}
                  </TaskLink>
                ))
              ) : (
                <p className="small">Connect a wallet from the tray to buy, sell or redeem.</p>
              )}
              {nSel > 0 && (
                <TaskLink icon="error" onClick={() => setSelected(new Set())}>
                  Clear selection
                </TaskLink>
              )}
              <p className={`task-quote${quoted && nSel ? ' on' : ''}`}>{quoteText}</p>
            </TaskBox>
            <TaskBox title="Other Places">
              <TaskLink icon="exchange" onClick={() => navigate('legacy')}>
                Legacy Exchange
              </TaskLink>
              <TaskLink icon="gallery" onClick={() => navigate('gallery')}>
                Remy Gallery
              </TaskLink>
              <TaskLink icon="approvals" onClick={() => navigate('approvals')}>
                Approvals Manager
              </TaskLink>
            </TaskBox>
            <TaskBox title="Details">
              <dl className="kv tight">
                <dt>Floor price</dt>
                <dd>{spot ? `${spot.toPrecision(3)} ETH` : router ? '—' : 'pool soon'}</dd>
                <dt>In vault</dt>
                <dd>{invCount?.toString() ?? '…'}</dd>
                <dt>Your fREMY</dt>
                <dd>{address ? fmt(fremyBal, 18, 4) : '—'}</dd>
                <dt>Your ETH</dt>
                <dd>{address ? fmt(ethBal?.value, 18, 4) : '—'}</dd>
              </dl>
              <p className="muted small">1 fREMY = any 1 Remy in the vault.</p>
            </TaskBox>
          </TaskPane>
        )}
        <main className="split-main scroll ex-view">
          {tab === 'buy' ? (
            <Grid ids={inv.ids} selected={selected} toggle={toggle} loading={inv.loading} empty="The vault is empty right now." />
          ) : address ? (
            <Grid ids={mine.ids} selected={selected} toggle={toggle} loading={mine.loading} empty="No Remys in this wallet." />
          ) : (
            <ConnectPrompt why="Connect to sell or deposit your Remys." />
          )}
        </main>
      </div>
      {mobile && address && (
        <div className="cmdbar">
          <div className="cmd-info">
            <b>{nSel} selected</b>
            <small>{quoteText}</small>
          </div>
          {actions
            .slice()
            .reverse()
            .map((a) => (
              <button type="button" key={a.key} className={`btn${a.primary ? ' default' : ''}`} disabled={a.disabled} onClick={a.run}>
                {a.key === 'buy' ? 'Buy' : a.key === 'sell' ? 'Sell' : a.key === 'redeem' ? 'Redeem' : 'Deposit'}
              </button>
            ))}
        </div>
      )}
      <StatusBar
        status={tx.status}
        busy={tx.busy}
        right={`${tab === 'buy' ? (invCount?.toString() ?? '…') : mine.total} objects${nSel ? ` · ${nSel} selected` : ''}`}
      >
        1 fREMY = any 1 Remy in the vault
      </StatusBar>
    </>
  )
}

export function Vault({ navigate }: AppProps) {
  const { address } = useAccount()
  if (!NEW.vault || !NEW.fremy)
    return (
      <ComingSoon title="The new Remy Vault is under construction" app="Remy Vault">
        Every Remy in the vault is backed by exactly one fREMY. Deposit a Remy to get 1 fREMY, redeem 1 fREMY for any Remy, or buy straight from the vault with
        ETH.
      </ComingSoon>
    )
  return (
    <div className="app-col explorer">
      <VaultInner key={address} vault={NEW.vault} fremy={NEW.fremy} router={NEW.router} navigate={navigate} />
    </div>
  )
}
