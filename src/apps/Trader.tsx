import { type ReactNode, useMemo, useState } from 'react'
import { type Address, formatUnits, parseUnits } from 'viem'
import { useAccount, useBalance, useReadContract } from 'wagmi'
import { readContract } from 'wagmi/actions'
import { erc20Abi, routerAbi } from '../abis'
import { EXPLORER, NEW } from '../config'
import { useDataSnapshot } from '../lib/data'
import { deadline, fmt, shortAddr } from '../lib/format'
import { type RangeSelection, liquiditySelection, resolveLiquidityRange } from '../lib/liquidityRange'
import { useQuote } from '../lib/pool'
import { POOL_KEY, type PoolData, type Position, type Trade, closeStep, collectStep, mintSteps, removeStep, usePoolData, usePositions } from '../lib/trader'
import type { TxStep } from '../lib/tx'
import {
  type Range,
  amount0Delta,
  amountsForLiquidity,
  bandDepth,
  ethPriceAtSqrt,
  ethPriceAtTick,
  getSqrtPriceAtTick,
  mulDivUp,
  positionFor,
  rangeSide,
  simulateBuy,
} from '../lib/v4math'
import type { AppProps } from '../os/apps'
import { Icon } from '../os/icons'
import { messageBox, useIsMobile } from '../os/shell'
import { type TxUi, useTxUi } from '../os/system'
import { Banner, ConnectPrompt, Group, Loading, StatusBar } from '../os/ui'
import { config } from '../wagmi'
import { TraderRange } from './TraderRange'

const ONE = 10n ** 18n
const SPACING = POOL_KEY.tickSpacing

/* --- formatting ---------------------------------------------------------------------------------------- */

const px = (p: number | undefined) => (p === undefined || !Number.isFinite(p) ? '—' : p < 0.01 ? p.toFixed(6) : p.toPrecision(4))
const pct = (x: number) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(2)}%`
const clock = (t: number) => new Date(t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
const day = (t: number) => new Date(t * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' })

function parse(v: string): bigint | undefined {
  try {
    return v ? parseUnits(v, 18) : undefined
  } catch {
    return undefined
  }
}

function Num({ children, tone }: { children: ReactNode; tone?: 'up' | 'down' }) {
  return <span className={`num${tone ? ` ${tone}` : ''}`}>{children}</span>
}

/* --- ticker tape & quote header ------------------------------------------------------------------------ */

function Ticker({ pool, inventory, outside }: { pool: PoolData; inventory?: bigint; outside?: bigint }) {
  const up = (pool.change24h ?? 0) >= 0
  const last = pool.trades[0]
  const items: Record<string, ReactNode> = {
    fREMY: (
      <>
        <Num>{px(pool.price)}</Num> ETH{' '}
        {pool.change24h !== undefined && (
          <Num tone={up ? 'up' : 'down'}>
            {up ? '▲' : '▼'} {pct(pool.change24h)}
          </Num>
        )}
      </>
    ),
    VAULT: (
      <>
        <Num>{inventory?.toString() ?? '…'}</Num> Remys
      </>
    ),
    'fREMY OUT': <Num>{fmt(outside, 18, 2)}</Num>,
    'VOL 24H': (
      <>
        <Num>{fmt(pool.volume24hEth, 18, 4)}</Num> ETH
      </>
    ),
    'TRADES 24H': <Num>{pool.trades24h}</Num>,
    LAST: last ? (
      <Num tone={last.side === 'buy' ? 'up' : 'down'}>
        {last.side === 'buy' ? '▲ BUY' : '▼ SELL'} {fmt(last.fremy, 18, 3)} @ {px(last.price)}
      </Num>
    ) : (
      <Num>no trades yet</Num>
    ),
    FEE: (
      <>
        <Num>1.00%</Num> to LPs
      </>
    ),
  }
  const run = Object.entries(items).map(([label, value]) => (
    <span key={label} className="tt-item">
      <b>{label}</b> {value}
    </span>
  ))
  return (
    <div className="ticker" aria-label="Market ticker">
      <div className="ticker-run">
        {run}
        <span aria-hidden="true" className="ticker-dup">
          {run}
        </span>
      </div>
    </div>
  )
}

function QuoteHeader({ pool }: { pool: PoolData }) {
  const up = (pool.change24h ?? 0) >= 0
  return (
    <header className="quote-head">
      <div className="qh-sym">
        <Icon name="coin" size={32} />
        <div>
          <b>fREMY / ETH</b>
          <small>Uniswap v4 · 1% fee · 1 fREMY = 1 Remy</small>
        </div>
      </div>
      <div className="qh-last">
        <span className="num big">{px(pool.price)}</span>
        <small>ETH per fREMY</small>
      </div>
      <dl className="qh-stats">
        <div>
          <dt>{pool.changeSinceOpen ? 'Since open' : '24h'}</dt>
          <dd className={`num ${up ? 'up' : 'down'}`}>{pool.change24h === undefined ? '—' : `${up ? '▲' : '▼'} ${pct(pool.change24h)}`}</dd>
        </div>
        <div>
          <dt>Volume 24h</dt>
          <dd className="num">{fmt(pool.volume24hEth, 18, 4)} ETH</dd>
        </div>
        <div>
          <dt>Tick</dt>
          <dd className="num">{pool.tick}</dd>
        </div>
      </dl>
    </header>
  )
}

/* --- Market tab ---------------------------------------------------------------------------------------- */

function Chart({ pool }: { pool: PoolData }) {
  const W = 560
  const H = 220
  const pad = { l: 8, r: 74, t: 12, b: 22 }
  const pts = pool.series
  const t0 = pts[0]?.time ?? pool.now - 3600
  const t1 = Math.max(pool.now, t0 + 60)
  const prices = pts.map((p) => p.price)
  let lo = Math.min(...prices)
  let hi = Math.max(...prices)
  const span = hi - lo || hi * 0.02
  lo -= span * 0.15
  hi += span * 0.15
  const x = (t: number) => pad.l + ((t - t0) / (t1 - t0)) * (W - pad.l - pad.r)
  const y = (p: number) => pad.t + (1 - (p - lo) / (hi - lo)) * (H - pad.t - pad.b)
  // Step line: price holds until the next trade.
  let d = ''
  pts.forEach((p, i) => {
    d += i === 0 ? `M${x(p.time)},${y(p.price)}` : `H${x(p.time)}V${y(p.price)}`
  })
  const lastY = y(pool.price)
  const area = `${d}H${W - pad.r}V${H - pad.b}H${x(t0)}Z`
  const grid = [0, 1, 2, 3].map((i) => lo + ((hi - lo) * (i + 0.5)) / 4)
  // Enough decimals that neighbouring gridlines never print the same label.
  const decimals = Math.min(10, Math.max(6, Math.ceil(-Math.log10((hi - lo) / 4)) + 1))
  const times = [0, 1, 2, 3].map((i) => t0 + ((t1 - t0) * i) / 3)
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Price chart, last ${px(pool.price)} ETH`}>
      <defs>
        <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3ddc4a" stopOpacity=".45" />
          <stop offset="1" stopColor="#3ddc4a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {grid.map((g) => (
        <g key={g}>
          <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} className="chart-grid" />
          <text x={W - pad.r + 6} y={y(g) + 4} className="chart-label">
            {g.toFixed(decimals)}
          </text>
        </g>
      ))}
      {times.map((t) => (
        <text key={t} x={Math.min(x(t), W - pad.r - 30)} y={H - 6} className="chart-label">
          {t1 - t0 > 86_400 ? day(t) : clock(t).slice(0, 5)}
        </text>
      ))}
      <path d={area} fill="url(#chart-fill)" />
      <path d={d} className="chart-line" />
      {pool.trades.slice(0, 40).map((t) => (
        <circle key={t.key} cx={x(t.time)} cy={y(t.price)} r="2.6" className={t.side === 'buy' ? 'dot-up' : 'dot-down'} />
      ))}
      <line x1={pad.l} x2={W - pad.r} y1={lastY} y2={lastY} className="chart-last" />
      <rect x={W - pad.r + 2} y={lastY - 8} width={pad.r - 4} height="16" rx="2" className="chart-tag" />
      <text x={W - pad.r + 6} y={lastY + 4} className="chart-tag-text">
        {px(pool.price)}
      </text>
    </svg>
  )
}

function TimeAndSales({ trades }: { trades: Trade[] }) {
  if (!trades.length)
    return (
      <div className="tape-empty">
        <Icon name="info" size={24} />
        No trades yet. The first buy shows up here.
      </div>
    )
  return (
    <div className="tape-wrap">
      <table className="tape">
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Side</th>
            <th scope="col">fREMY</th>
            <th scope="col">ETH</th>
            <th scope="col">Price</th>
          </tr>
        </thead>
        <tbody>
          {trades.slice(0, 60).map((t) => (
            <tr key={t.key} className={t.side}>
              <td>
                <a href={`${EXPLORER}/tx/${t.hash}`} target="_blank" rel="noreferrer">
                  {clock(t.time)}
                </a>
              </td>
              <td>{t.side === 'buy' ? '▲ BUY' : '▼ SELL'}</td>
              <td>{fmt(t.fremy, 18, 4)}</td>
              <td>{fmt(t.eth, 18, 6)}</td>
              <td>{px(t.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Level II style ladder: fREMY offered above the price (asks), ETH bids below, in equal-tick bands. */
function DepthLadder({ pool, extra }: { pool: PoolData; extra?: Range }) {
  const ranges = extra ? [...pool.ranges, extra] : pool.ranges
  const rows = useMemo(() => {
    const cur = pool.tick
    const minTick = Math.min(cur - SPACING * 10, ...ranges.map((r) => r.tickLower))
    const maxTick = Math.max(cur + SPACING * 10, ...ranges.map((r) => r.tickUpper))
    const band = (a: number, b: number) => ({ a, b, ...bandDepth(pool.sqrtPriceX96, ranges, a, b) })
    const asks: ReturnType<typeof band>[] = []
    const bids: ReturnType<typeof band>[] = []
    const nA = 10
    const nB = 5
    for (let i = 0; i < nA; i++) {
      const a = Math.round(minTick + ((cur + 1 - minTick) * i) / nA)
      const b = Math.round(minTick + ((cur + 1 - minTick) * (i + 1)) / nA)
      asks.push(band(a, b))
    }
    for (let i = 0; i < nB; i++) {
      const a = Math.round(cur + 1 + ((maxTick - cur - 1) * i) / nB)
      const b = Math.round(cur + 1 + ((maxTick - cur - 1) * (i + 1)) / nB)
      bids.push(band(a, b))
    }
    return { asks, bids }
  }, [pool, ranges])
  const maxF = rows.asks.reduce((m, r) => (r.fremy > m ? r.fremy : m), 1n)
  const maxE = rows.bids.reduce((m, r) => (r.eth > m ? r.eth : m), 1n)
  const w = (v: bigint, m: bigint) => `${Math.max(v > 0n ? 2 : 0, Number((v * 1000n) / m) / 10)}%`
  return (
    <table className="ladder">
      <thead>
        <tr>
          <th scope="col">ETH / fREMY</th>
          <th scope="col">Size</th>
        </tr>
      </thead>
      <tbody>
        {rows.asks.map((r) => (
          <tr key={`a${r.a}`} className="ask">
            <td className="num">
              {px(ethPriceAtTick(r.b))}–{px(ethPriceAtTick(r.a))}
            </td>
            <td>
              <span className="bar" style={{ width: w(r.fremy, maxF) }} />
              <span className="num">{r.fremy ? `${fmt(r.fremy, 18, 2)} fREMY` : '·'}</span>
            </td>
          </tr>
        ))}
        <tr className="spot">
          <td className="num">{px(pool.price)}</td>
          <td>◄ last price</td>
        </tr>
        {rows.bids.map((r) => (
          <tr key={`b${r.a}`} className="bid">
            <td className="num">
              {px(ethPriceAtTick(r.b))}–{px(ethPriceAtTick(r.a))}
            </td>
            <td>
              <span className="bar" style={{ width: w(r.eth, maxE) }} />
              <span className="num">{r.eth ? `${fmt(r.eth, 18, 4)} ETH` : '·'}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Market({ pool }: { pool: PoolData }) {
  return (
    <div className="mkt">
      <Group title="Price chart · ETH per fREMY" className="mkt-chart">
        <Chart pool={pool} />
      </Group>
      <Group title="Level II · liquidity by price" className="mkt-ladder">
        <DepthLadder pool={pool} />
      </Group>
      <Group title="Time & Sales" className="mkt-tape">
        <TimeAndSales trades={pool.trades} />
      </Group>
    </div>
  )
}

/* --- Trade tab ----------------------------------------------------------------------------------------- */

function OrderTicket({ pool, tx, navigate }: { pool: PoolData; tx: TxUi; navigate: (h: string) => void }) {
  const { address } = useAccount()
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [qty, setQty] = useState('1')
  const [slip, setSlip] = useState(1)
  const amount = parse(qty) ?? 0n
  const quote = useQuote(POOL_KEY, side, amount)
  const quoted = quote.data?.[0]
  const { data: eth } = useBalance({ address, query: { enabled: !!address } })
  const { data: fremy } = useReadContract({
    address: NEW.fremy,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })
  const avg = quoted && amount ? Number(quoted) / Number(amount) : undefined
  const impact = avg ? (side === 'buy' ? avg / pool.price - 1 : 1 - avg / pool.price) : undefined
  const bps = BigInt(Math.round(slip * 100))
  const short = side === 'buy' ? !!quoted && !!eth && eth.value < (quoted * (10_000n + bps)) / 10_000n : fremy === undefined || fremy < amount

  const submit = () => {
    if (!address || !quoted) return
    const me = address as Address
    const steps: TxStep[] =
      side === 'buy'
        ? [
            {
              label: `Buy ${fmt(amount, 18, 4)} fREMY`,
              request: {
                address: NEW.router,
                abi: routerAbi,
                functionName: 'buyFloor',
                args: [amount, me, deadline()],
                value: (quoted * (10_000n + bps)) / 10_000n,
              },
            },
          ]
        : [
            {
              label: 'Approve fREMY',
              request: async () =>
                (await readContract(config, {
                  address: NEW.fremy,
                  abi: erc20Abi,
                  functionName: 'allowance',
                  args: [me, NEW.router],
                })) >= amount
                  ? null
                  : { address: NEW.fremy, abi: erc20Abi, functionName: 'approve', args: [NEW.router, amount] },
            },
            {
              label: `Sell ${fmt(amount, 18, 4)} fREMY`,
              request: {
                address: NEW.router,
                abi: routerAbi,
                functionName: 'sellFloor',
                args: [amount, (quoted * (10_000n - bps)) / 10_000n, me, deadline()],
              },
            },
          ]
    messageBox({
      title: 'Confirm order',
      icon: 'question',
      text:
        side === 'buy'
          ? `Buy ${fmt(amount, 18, 4)} fREMY for about ${fmt(quoted, 18, 6)} ETH (at most ${fmt((quoted * (10_000n + bps)) / 10_000n, 18, 6)} ETH; unused ETH is refunded). Continue?`
          : `Sell ${fmt(amount, 18, 4)} fREMY for about ${fmt(quoted, 18, 6)} ETH (at least ${fmt((quoted * (10_000n - bps)) / 10_000n, 18, 6)} ETH). Continue?`,
      onConfirm: async () => {
        if (await tx.run(steps)) setQty('')
      },
    })
  }

  return (
    <div className="ticket-wrap">
      <section className="ticket" aria-label="Order ticket">
        <header className="ticket-head">
          <Icon name={side === 'buy' ? 'eth' : 'coin'} size={24} />
          <b>Order Ticket</b>
          <span>fREMY / ETH</span>
        </header>
        <div className="ticket-body">
          <fieldset className="seg">
            <legend className="sr-only">Action</legend>
            <label className={side === 'buy' ? 'on buy' : ''}>
              <input type="radio" name="side" className="sr-only" checked={side === 'buy'} onChange={() => setSide('buy')} />▲ Buy fREMY
            </label>
            <label className={side === 'sell' ? 'on sell' : ''}>
              <input type="radio" name="side" className="sr-only" checked={side === 'sell'} onChange={() => setSide('sell')} />▼ Sell fREMY
            </label>
          </fieldset>
          <div className="ticket-grid">
            <label htmlFor="tk-qty">Quantity</label>
            <div className="input-wrap">
              <input id="tk-qty" className="input num" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value.replace(/[^0-9.]/g, ''))} />
              {side === 'sell' && (
                <button type="button" className="chip" onClick={() => fremy !== undefined && setQty(formatUnits(fremy, 18))}>
                  Max
                </button>
              )}
              <span className="unit">fREMY</span>
            </div>
            <span>{side === 'buy' ? 'Est. cost' : 'Est. proceeds'}</span>
            <b className="num">{amount ? (quote.isLoading ? 'quoting…' : quoted ? `${fmt(quoted, 18, 6)} ETH` : 'not enough liquidity') : '—'}</b>
            <span>Avg price</span>
            <span className="num">{avg ? `${px(avg)} ETH` : '—'}</span>
            <span>Price impact</span>
            <span className={`num${impact && impact > 0.03 ? ' down' : ''}`}>{impact !== undefined ? pct(impact) : '—'}</span>
            <label htmlFor="tk-slip">Slippage</label>
            <select id="tk-slip" className="select" value={slip} onChange={(e) => setSlip(Number(e.target.value))}>
              {[0.5, 1, 2, 5].map((s) => (
                <option key={s} value={s}>
                  {s}%
                </option>
              ))}
            </select>
          </div>
          <p className="muted small">Includes the 1% LP fee and Uniswap's 0.1% protocol fee.</p>
          {!address ? (
            <ConnectPrompt why="Connect a wallet to trade fREMY." />
          ) : (
            <div className="row end">
              {short && amount > 0n && <span className="err small">Not enough {side === 'buy' ? 'ETH' : 'fREMY'}.</span>}
              <button
                type="button"
                className={`btn default ${side === 'buy' ? 'go-buy' : 'go-sell'}`}
                disabled={tx.busy || !quoted || !amount || short}
                onClick={submit}
              >
                {side === 'buy' ? 'Place buy order' : 'Place sell order'}
              </button>
            </div>
          )}
        </div>
      </section>
      <aside className="ticket-side">
        <Group title="Account">
          <dl className="kv">
            <dt>ETH</dt>
            <dd className="num">{address ? fmt(eth?.value, 18, 5) : '—'}</dd>
            <dt>fREMY</dt>
            <dd className="num">{address ? fmt(fremy, 18, 4) : '—'}</dd>
          </dl>
        </Group>
        <Group title="Why fREMY?">
          <p className="small">Each fREMY redeems any one Remy held by the vault. Buying fREMY here is buying the floor.</p>
          <button type="button" className="btn" onClick={() => navigate('vault')}>
            <Icon name="vault" size={16} />
            Pick Remys in the Vault
          </button>
        </Group>
      </aside>
    </div>
  )
}

/* --- Market Maker tab ---------------------------------------------------------------------------------- */

function MarketMaker({ pool, tx, onDone }: { pool: PoolData; tx: TxUi; onDone: () => void }) {
  const { address } = useAccount()
  const [selection, setSelection] = useState<RangeSelection>(() => liquiditySelection('sell'))
  const [deposit, setDeposit] = useState<{ value: string; asset: 'eth' | 'fremy' }>({ value: '', asset: 'fremy' })
  const { data: eth } = useBalance({ address, query: { enabled: !!address } })
  const { data: fremyBal } = useReadContract({
    address: NEW.fremy,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  const { range, error: rangeError } = resolveLiquidityRange(pool.sqrtPriceX96, selection, SPACING)
  const ok = !!range
  const tickLower = range?.tickLower ?? 0
  const tickUpper = range?.tickUpper ?? 0
  const side = ok ? rangeSide(pool.sqrtPriceX96, tickLower, tickUpper) : 'fremy'
  const input: 'eth' | 'fremy' = side === 'eth' ? 'eth' : 'fremy'
  const amt = deposit.asset === input ? deposit.value : ''
  const setAmt = (value: string) => setDeposit({ value, asset: input })
  const amount = parse(amt) ?? 0n
  const bal = input === 'eth' ? eth?.value : fremyBal
  const pos = ok && amount > 0n ? positionFor(pool.sqrtPriceX96, tickLower, tickUpper, input, amount) : undefined
  // Straddling mints may need a little more of the paired token if the price moves before inclusion.
  const amount0Max = pos && pos.amount0 > 0n ? (side === 'both' ? mulDivUp(pos.amount0, 102n, 100n) + 1n : pos.amount0) : 0n
  const amount1Max = pos?.amount1 ?? 0n
  const short = !!pos && ((eth !== undefined && eth.value < amount0Max) || (fremyBal !== undefined && fremyBal < amount1Max))

  const preview = useMemo(() => {
    if (!pos) return undefined
    const mine: Range = { tickLower, tickUpper, liquidity: pos.liquidity }
    const rows = [1, 5, 10, 25].map((n) => {
      const now = simulateBuy(pool.sqrtPriceX96, pool.ranges, BigInt(n) * ONE)
      const withMe = simulateBuy(pool.sqrtPriceX96, [...pool.ranges, mine], BigInt(n) * ONE)
      return { n, now, withMe }
    })
    const sqrtA = getSqrtPriceAtTick(tickLower)
    const sqrtB = getSqrtPriceAtTick(tickUpper)
    const raised = amount0Delta(sqrtA, sqrtB, pos.liquidity, false)
    const fremyIfDip = amountsForLiquidity(sqrtB, sqrtA, sqrtB, pos.liquidity).amount1
    return { mine, rows, raised, fremyIfDip }
  }, [pos, tickLower, tickUpper, pool])

  const submit = () => {
    if (!address || !pos) return
    messageBox({
      title: 'Add liquidity',
      icon: 'question',
      text: `Add ${amount1Max ? `${fmt(amount1Max, 18, 4)} fREMY` : ''}${amount1Max && amount0Max ? ' and ' : ''}${amount0Max ? `up to ${fmt(amount0Max, 18, 6)} ETH` : ''} between ${px(ethPriceAtTick(tickUpper))} and ${px(ethPriceAtTick(tickLower))} ETH per fREMY. You receive a position NFT and earn a share of the ${pool.lpFee / 10_000}% LP fee on trades through your range. Continue?`,
      onConfirm: async () => {
        if (await tx.run(mintSteps(address, { tickLower, tickUpper, liquidity: pos.liquidity, amount0Max, amount1Max }))) {
          setAmt('')
          onDone()
        }
      },
    })
  }

  const sideLabel = side === 'eth' ? 'ETH only' : side === 'fremy' ? 'fREMY only' : 'fREMY + ETH'
  const changeRange = (next: RangeSelection) => {
    const nextRange = resolveLiquidityRange(pool.sqrtPriceX96, next, SPACING).range
    const nextInput = nextRange && rangeSide(pool.sqrtPriceX96, nextRange.tickLower, nextRange.tickUpper) === 'eth' ? 'eth' : 'fremy'
    if (nextInput !== input) setAmt('')
    setSelection(next)
  }
  return (
    <div className="mm">
      <TraderRange selection={selection} onChange={changeRange} floor={pool.price} spacing={SPACING} range={range} error={rangeError} />
      <div className="mm-body">
        <div className="mm-left">
          <Group title="Your deposit" className="mm-deposit">
            <div className="mm-deposit-heading">
              <label htmlFor="mm-amt">Amount to provide</label>
              <span className={`side-badge ${side}`}>{ok ? sideLabel : 'Choose a valid range'}</span>
            </div>
            <div className="input-wrap">
              <label className="sr-only" htmlFor="mm-amt">
                Amount in {input === 'eth' ? 'ETH' : 'fREMY'}
              </label>
              <input
                id="mm-amt"
                className="input num"
                inputMode="decimal"
                placeholder="0"
                value={amt}
                onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ''))}
              />
              <button
                type="button"
                className="chip"
                onClick={() => bal !== undefined && setAmt(formatUnits(input === 'eth' ? (bal * 95n) / 100n : bal, 18))}
              >
                Max
              </button>
              <span className="unit">{input === 'eth' ? 'ETH' : 'fREMY'}</span>
            </div>
            <p className="muted small">
              Balance: {address ? `${fmt(bal, 18, input === 'eth' ? 5 : 4)} ${input === 'eth' ? 'ETH' : 'fREMY'}` : 'connect a wallet'}
              {side === 'both' && pos ? ` · also needs up to ${fmt(amount0Max, 18, 8)} ETH` : ''}
            </p>
            {!address ? (
              <ConnectPrompt why="Connect a wallet to provide liquidity." />
            ) : (
              <div className="row end">
                {short && <span className="err small">Not enough balance.</span>}
                <button type="button" className="btn default" disabled={tx.busy || !pos || pos.liquidity === 0n || short} onClick={submit}>
                  <Icon name="coin" size={16} />
                  Create position
                </button>
              </div>
            )}
          </Group>
        </div>
        <div className="mm-right">
          <Group title="Your position" className="mm-summary">
            <div className="mm-summary-range">
              <small>Trades across this price range</small>
              <b className="num">
                {ok ? `${px(ethPriceAtTick(tickUpper))} → ${px(ethPriceAtTick(tickLower))}` : '—'} <small>ETH</small>
              </b>
            </div>
            {!preview ? (
              <p className="muted small">Enter an amount to preview your deposit and what it becomes as the price moves.</p>
            ) : (
              <>
                <dl className="kv">
                  <dt>You deposit</dt>
                  <dd className="num">
                    {amount1Max ? `${fmt(amount1Max, 18, 4)} fREMY` : ''}
                    {amount1Max && amount0Max ? ' + ' : ''}
                    {amount0Max ? `${fmt(amount0Max, 18, 6)} ETH` : ''}
                  </dd>
                  <dt>At the upper price</dt>
                  <dd className="num">≈ {fmt(preview.raised, 18, 5)} ETH</dd>
                  <dt>At the lower price</dt>
                  <dd className="num">≈ {fmt(preview.fremyIfDip, 18, 4)} fREMY</dd>
                </dl>
                <p className="muted small">End balances exclude fees earned.</p>
              </>
            )}
            <p className="mm-fee-note">Earn a share of the {pool.lpFee / 10_000}% LP fee on trades through your range.</p>
            <p className="muted small">Outside your range, the position holds one token and pauses earning fees until the price returns.</p>
          </Group>
        </div>
      </div>
      <details className="mm-details">
        <summary>
          Market depth & price impact <span>See how your position changes liquidity</span>
        </summary>
        <div className="mm-body">
          <Group title="Depth with your position">
            <DepthLadder pool={pool} extra={preview?.mine} />
          </Group>
          <Group title="Buy impact">
            {!preview || side === 'eth' ? (
              <p className="muted small">Add a selling position to compare the price impact of buys.</p>
            ) : (
              <table className="impact">
                <caption>Price after buying N Remys (ETH per fREMY)</caption>
                <thead>
                  <tr>
                    <th scope="col">N</th>
                    <th scope="col">Now</th>
                    <th scope="col">With yours</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r) => (
                    <tr key={r.n}>
                      <td>{r.n}</td>
                      <td className="num">{r.now.filled < BigInt(r.n) * ONE ? 'sold out' : px(ethPriceAtSqrt(r.now.sqrtAfter))}</td>
                      <td className="num up">
                        {r.withMe.filled < BigInt(r.n) * ONE ? 'sold out' : px(ethPriceAtSqrt(r.withMe.sqrtAfter))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Group>
        </div>
      </details>
    </div>
  )
}

/* --- My Positions tab ---------------------------------------------------------------------------------- */

function PositionCard({ p, pool, tx }: { p: Position; pool: PoolData; tx: TxUi }) {
  const { address } = useAccount()
  const [pctSel, setPct] = useState(50)
  const me = address as Address
  const lo = ethPriceAtTick(p.tickUpper)
  const hi = ethPriceAtTick(p.tickLower)
  // Where the price sits across the range on a log scale, for the range bar.
  const at = Math.min(1, Math.max(0, Math.log(pool.price / lo) / Math.log(hi / lo)))
  const minsFor = (liquidity: bigint) => {
    const a = amountsForLiquidity(pool.sqrtPriceX96, getSqrtPriceAtTick(p.tickLower), getSqrtPriceAtTick(p.tickUpper), liquidity)
    return { min0: (a.amount0 * 98n) / 100n, min1: (a.amount1 * 98n) / 100n }
  }
  const confirm = (text: string, step: TxStep) => messageBox({ title: `Position #${p.tokenId}`, icon: 'question', text, onConfirm: () => tx.run([step]) })
  const hasFees = p.fee0 > 0n || p.fee1 > 0n
  return (
    <li className={`pos${p.inRange ? ' in' : ''}`}>
      <div className="pos-head">
        <Icon name="coin" size={24} />
        <b>Position #{p.tokenId.toString()}</b>
        <span className={`pos-badge ${p.inRange ? 'in' : 'out'}`}>{p.inRange ? '● In range, earning' : '○ Out of range'}</span>
        <a className="small" href={`https://app.uniswap.org/positions/v4/base/${p.tokenId}`} target="_blank" rel="noreferrer">
          Uniswap
        </a>
      </div>
      <div className="pos-range" title={`Price ${px(pool.price)} ETH`}>
        <span className="num">{px(lo)}</span>
        <span className="pos-track">
          <i style={{ left: `${at * 100}%` }} />
        </span>
        <span className="num">{px(hi)}</span>
      </div>
      <dl className="pos-kv">
        <div>
          <dt>Holding</dt>
          <dd className="num">
            {fmt(p.amount1, 18, 4)} fREMY
            <br />
            {fmt(p.amount0, 18, 6)} ETH
          </dd>
        </div>
        <div>
          <dt>Unclaimed fees</dt>
          <dd className={`num${hasFees ? ' up' : ''}`}>
            {fmt(p.fee1, 18, 6)} fREMY
            <br />
            {fmt(p.fee0, 18, 8)} ETH
          </dd>
        </div>
        <div>
          <dt>Liquidity</dt>
          <dd className="num">{p.liquidity.toString()}</dd>
        </div>
      </dl>
      <div className="pos-act">
        <button
          type="button"
          className="btn"
          disabled={tx.busy || !hasFees}
          onClick={() => confirm(`Collect ${fmt(p.fee1, 18, 6)} fREMY and ${fmt(p.fee0, 18, 8)} ETH in fees to your wallet?`, collectStep(p.tokenId, me))}
        >
          Collect fees
        </button>
        <span className="grow" />
        <label className="sr-only" htmlFor={`rm-${p.tokenId}`}>
          Percent to remove
        </label>
        <select id={`rm-${p.tokenId}`} className="select" value={pctSel} onChange={(e) => setPct(Number(e.target.value))}>
          {[25, 50, 75].map((x) => (
            <option key={x} value={x}>
              {x}%
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn"
          disabled={tx.busy || p.liquidity === 0n}
          onClick={() => {
            const liq = (p.liquidity * BigInt(pctSel)) / 100n
            const { min0, min1 } = minsFor(liq)
            confirm(
              `Withdraw ${pctSel}% of this position (plus its fees) to your wallet? The NFT stays open.`,
              removeStep(p.tokenId, me, liq, min0, min1, pctSel),
            )
          }}
        >
          Remove
        </button>
        <button
          type="button"
          className="btn"
          disabled={tx.busy}
          onClick={() => {
            const { min0, min1 } = minsFor(p.liquidity)
            confirm('Withdraw everything and fees, then burn the position NFT?', closeStep(p.tokenId, me, min0, min1))
          }}
        >
          Close
        </button>
      </div>
    </li>
  )
}

function Positions({ pool, tx }: { pool: PoolData; tx: TxUi }) {
  const { address } = useAccount()
  const q = usePositions(address, pool.sqrtPriceX96)
  if (!address) return <ConnectPrompt why="Connect the wallet that holds your liquidity positions." />
  if (q.isLoading) return <Loading>Scanning Position Manager transfers for {shortAddr(address)}…</Loading>
  if (q.error)
    return (
      <Banner tone="bad" icon="error" title="Could not load positions">
        {String((q.error as Error).message).split('\n')[0]}
      </Banner>
    )
  if (!q.data?.length)
    return (
      <div className="empty-folder">
        <Icon name="folder" size={48} />
        <b>No positions yet</b>
        <p className="muted">Positions you open in the Market Maker tab show up here with their fees.</p>
      </div>
    )
  return (
    <ul className="positions">
      {q.data.map((p) => (
        <PositionCard key={p.tokenId.toString()} p={p} pool={pool} tx={tx} />
      ))}
    </ul>
  )
}

/* --- shell --------------------------------------------------------------------------------------------- */

const TABS = [
  { id: 'market', label: 'Market', icon: 'trader' },
  { id: 'trade', label: 'Trade', icon: 'eth' },
  { id: 'mm', label: 'Market Maker', icon: 'coin' },
  { id: 'positions', label: 'My Positions', icon: 'folder' },
] as const
type Tab = (typeof TABS)[number]['id']

export function Trader({ param, navigate }: AppProps) {
  const mobile = useIsMobile()
  const tab: Tab = TABS.some((t) => t.id === param) ? (param as Tab) : 'market'
  const setTab = (t: Tab) => navigate(`trader/${t}`)
  const tx = useTxUi()
  const pool = usePoolData()
  const { data: snapshot } = useDataSnapshot()
  const inventory = snapshot ? BigInt(snapshot.stats.inventory) : undefined
  const outside = snapshot ? BigInt(snapshot.stats.fremySupply) - BigInt(snapshot.stats.fremyInVault) : undefined

  return (
    <div className="app-col trader">
      {pool.data && <Ticker pool={pool.data} inventory={inventory} outside={outside} />}
      {pool.data && !mobile && <QuoteHeader pool={pool.data} />}
      <div className="tabs trader-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={16} />
            {t.label}
          </button>
        ))}
      </div>
      <div className="tab-panel trader-panel scroll">
        {pool.error ? (
          <Banner tone="bad" icon="error" title="Market data unavailable">
            {String((pool.error as Error).message).split('\n')[0]}
          </Banner>
        ) : !pool.data ? (
          <Loading>Loading the fREMY/ETH tape from Base…</Loading>
        ) : tab === 'market' ? (
          <Market pool={pool.data} />
        ) : tab === 'trade' ? (
          <OrderTicket pool={pool.data} tx={tx} navigate={navigate} />
        ) : tab === 'mm' ? (
          <MarketMaker pool={pool.data} tx={tx} onDone={() => setTab('positions')} />
        ) : (
          <Positions pool={pool.data} tx={tx} />
        )}
      </div>
      <StatusBar status={tx.status} busy={tx.busy} right={pool.data ? `Block ${pool.data.latestBlock} · ${pool.data.trades.length} trades` : undefined}>
        {pool.data ? `Last ${px(pool.data.price)} ETH · pool ${POOL_KEY.fee / 10_000}% fee` : 'Connecting to the market…'}
      </StatusBar>
    </div>
  )
}
