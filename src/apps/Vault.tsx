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
import { type TxStep, useTx } from '../lib/tx'
import { ComingSoon, ConnectPrompt, StatusBar, Thumb } from '../os/ui'
import { config } from '../wagmi'

const ONE = 10n ** 18n
const PAGE = 60

type Deployed = { vault: Address; fremy: Address; router?: Address }

function Grid({ ids, selected, toggle, loading, empty }: { ids: bigint[]; selected: Set<bigint>; toggle: (id: bigint) => void; loading: boolean; empty: string }) {
  const { map } = useArtIndexes(ids)
  if (loading) return <div className="muted pad">Loading Remys…</div>
  if (!ids.length) return <div className="muted pad center">{empty}</div>
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
      <button type="button" className="btn small" disabled={page === 0} onClick={() => set(page - 1)}>
        ‹
      </button>
      <span>
        {page + 1} / {pages}
      </span>
      <button type="button" className="btn small" disabled={page >= pages - 1} onClick={() => set(page + 1)}>
        ›
      </button>
    </div>
  )
}

function VaultInner({ vault, fremy, router }: Deployed) {
  const { address } = useAccount()
  const tx = useTx()
  const [tab, setTab] = useState<'buy' | 'sell'>('buy')
  const [page, setPage] = useState(0)
  const [myPage, setMyPage] = useState(0)
  const [selected, setSelected] = useState<Set<bigint>>(new Set())
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
    done(await tx.run([{ label: `Buy ${ids.length} Remy`, request: { address: router, abi: routerAbi, functionName: 'buyNFTs', args: [ids, me, deadline()], value } }]))
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
        { label: `Redeem ${ids.length} Remy`, request: { address: vault, abi: vaultAbi, functionName: 'redeem', args: [ids, me] } },
      ]),
    )
  }
  const sell = async () => {
    if (!router || !quoted) return
    const minOut = (quoted * 98n) / 100n
    done(
      await tx.run([nftApproval(router), { label: `Sell ${ids.length} Remy`, request: { address: router, abi: routerAbi, functionName: 'sellNFTs', args: [ids, minOut, me, deadline()] } }]),
    )
  }
  const deposit = async () =>
    done(await tx.run([nftApproval(vault), { label: `Deposit ${ids.length} Remy`, request: { address: vault, abi: vaultAbi, functionName: 'deposit', args: [ids, me] } }]))

  const canRedeem = fremyBal !== undefined && fremyBal >= n * ONE

  return (
    <>
      <div className="vault-head">
        <div className="stat">
          <span>Floor price</span>
          <b>{spot ? `${spot.toPrecision(3)} ETH` : router ? '—' : 'pool soon'}</b>
        </div>
        <div className="stat">
          <span>In vault</span>
          <b>{invCount?.toString() ?? '…'}</b>
        </div>
        <div className="stat">
          <span>Your fREMY</span>
          <b>{address ? fmt(fremyBal, 18, 4) : '—'}</b>
        </div>
        <div className="stat">
          <span>Your ETH</span>
          <b>{address ? fmt(ethBal?.value, 18, 4) : '—'}</b>
        </div>
      </div>
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'buy'} className={tab === 'buy' ? 'on' : ''} onClick={() => setTab('buy')}>
          Buy / Redeem
        </button>
        <button type="button" role="tab" aria-selected={tab === 'sell'} className={tab === 'sell' ? 'on' : ''} onClick={() => setTab('sell')}>
          Sell / Deposit
        </button>
        <span className="tabs-fill" />
        {tab === 'buy' ? <Pager page={page} pages={inv.pages} set={setPage} /> : <Pager page={myPage} pages={mine.pages} set={setMyPage} />}
      </div>
      <div className="scroll grow pad-s">
        {tab === 'buy' ? (
          <Grid ids={inv.ids} selected={selected} toggle={toggle} loading={inv.loading} empty="The vault is empty right now." />
        ) : address ? (
          <Grid ids={mine.ids} selected={selected} toggle={toggle} loading={mine.loading} empty="No Remys in this wallet." />
        ) : (
          <ConnectPrompt why="Connect to sell or deposit your Remys." />
        )}
      </div>
      <div className="action-bar">
        <div className="sel-info">
          <b>{selected.size}</b> selected
          {selected.size > 0 && (
            <button type="button" className="linkish small" onClick={() => setSelected(new Set())}>
              clear
            </button>
          )}
          <div className="muted small">
            {selected.size === 0
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
                    : 'No pool liquidity for this size.'}
          </div>
        </div>
        {!address ? null : tab === 'buy' ? (
          <div className="row">
            <button type="button" className="btn" disabled={tx.busy || !selected.size || !canRedeem} onClick={redeem} title="Pay 1 fREMY per Remy">
              Redeem {selected.size || ''} with fREMY
            </button>
            <button type="button" className="btn primary" disabled={tx.busy || !selected.size || !quoted} onClick={buy}>
              Buy with ETH
            </button>
          </div>
        ) : (
          <div className="row">
            <button type="button" className="btn" disabled={tx.busy || !selected.size} onClick={deposit} title="Receive 1 fREMY per Remy">
              Deposit for fREMY
            </button>
            <button type="button" className="btn primary" disabled={tx.busy || !selected.size || !quoted} onClick={sell}>
              Sell for ETH
            </button>
          </div>
        )}
      </div>
      <StatusBar status={tx.status}>1 fREMY = any 1 Remy in the vault</StatusBar>
    </>
  )
}

export function Vault() {
  if (!NEW.vault || !NEW.fremy)
    return (
      <ComingSoon title="The new Remy Vault is almost here">
        Every Remy in the vault is backed by exactly one fREMY. Deposit a Remy to get 1 fREMY, redeem 1 fREMY for any Remy, or buy straight from
        the vault with ETH.
      </ComingSoon>
    )
  return (
    <div className="app-col">
      <VaultInner vault={NEW.vault} fremy={NEW.fremy} router={NEW.router} />
    </div>
  )
}
