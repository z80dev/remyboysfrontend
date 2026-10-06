import { type KeyboardEvent, type PointerEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { fmt } from '../lib/format'
import {
  PRESETS,
  type RangeSelection,
  type RangeSide,
  edgePrice,
  edgeSteps,
  formatFromMarket,
  formatPrice,
  maxStep,
  parsePrice,
  presetSelection,
  sameSelection,
  setEdge,
  shiftRange,
  spotSteps,
  stepForPrice,
  stepOfPrice,
} from '../lib/liquidityRange'
import type { PoolData } from '../lib/trader'
import { type Range, bandDepth, liquidityAt } from '../lib/v4math'

const MODES: { id: RangeSide; name: string; asset: string; icon: string; factor: number; description: string }[] = [
  {
    id: 'sell',
    name: 'Sell into strength',
    asset: 'Deposit fREMY',
    icon: '↗',
    factor: 2,
    description: 'An ask ladder above the market. Buyers lift your fREMY for ETH, a little more expensive with every step up.',
  },
  {
    id: 'buy',
    name: 'Buy the dip',
    asset: 'Deposit ETH',
    icon: '↙',
    factor: 2,
    description: 'A bid ladder below the market. Sellers fill your ETH with fREMY, a little cheaper with every step down.',
  },
  {
    id: 'both',
    name: 'Make both sides',
    asset: 'Deposit fREMY + ETH',
    icon: '↔',
    factor: 2,
    description: 'Quote around the market. You earn on flow in both directions while your mix shifts toward whatever traders sell you.',
  },
]

const EDGE_LABELS: Record<RangeSide, { low: string; high: string }> = {
  sell: { low: 'Start selling at', high: 'Sold out at' },
  buy: { low: 'Fully bought at', high: 'Start buying at' },
  both: { low: 'Low price', high: 'High price' },
}

export function TraderRange({
  pool,
  spacing,
  selection,
  onChange,
  side,
  error,
  mine,
  others,
}: {
  pool: PoolData
  spacing: number
  selection: RangeSelection
  onChange: (selection: RangeSelection) => void
  /** Side of the market the range sits on, when it resolves to a valid range. */
  side?: RangeSide
  error?: string
  /** The position being drafted, drawn on the chart. */
  mine?: Range
  /** The wallet's open positions in this pool. */
  others?: { tickLower: number; tickUpper: number }[]
}) {
  const [intent, setIntent] = useState<RangeSide>(side ?? 'sell')
  const [fit, setFit] = useState(0)
  const mode = side ?? intent
  const sqrtP = pool.sqrtPriceX96
  const edges = edgeSteps(sqrtP, selection, spacing)
  const labels = EDGE_LABELS[mode]
  const apply = (next: RangeSide, factor: number) => {
    setIntent(next)
    onChange(presetSelection(sqrtP, next, factor, spacing))
    setFit((n) => n + 1)
  }
  const commitEdge = (which: 'low' | 'high', q: number) => onChange(setEdge(sqrtP, selection, which, q, spacing))

  return (
    <section className="mm-designer" aria-label="Liquidity range">
      <div className="mm-heading">
        <div>
          <span className="mm-eyebrow">MARKET MAKER</span>
          <h2>Place your liquidity</h2>
        </div>
        <div className="mm-market">
          <span>Market price</span>
          <b className="num">
            {formatPrice(pool.price)} <small>ETH</small>
          </b>
        </div>
      </div>
      <fieldset className="mm-modes">
        <legend className="sr-only">Choose which side of the market to provide</legend>
        {MODES.map((x) => (
          <label key={x.id} className={`mm-mode${mode === x.id ? ' on' : ''}`}>
            <input type="radio" name="liquidity-mode" checked={mode === x.id} onChange={() => apply(x.id, x.factor)} />
            <span className="mm-mode-icon" aria-hidden="true">
              {x.icon}
            </span>
            <b>{x.name}</b>
            <small>{x.asset}</small>
          </label>
        ))}
      </fieldset>
      <p className="mm-explain">{MODES.find((x) => x.id === mode)?.description}</p>
      <fieldset className="mm-presets">
        <legend>Quick range</legend>
        {PRESETS[mode].map((p) => {
          const on = sameSelection(selection, presetSelection(sqrtP, mode, p.factor, spacing))
          return (
            <button type="button" key={p.label} className={`chip${on ? ' on' : ''}`} aria-pressed={on} onClick={() => apply(mode, p.factor)}>
              {p.label}
            </button>
          )
        })}
      </fieldset>
      <RangeChart
        pool={pool}
        spacing={spacing}
        selection={selection}
        onChange={onChange}
        edges={edges}
        labels={labels}
        valid={!error}
        mine={mine}
        others={others}
        fitSignal={fit}
      />
      <div className="mm-edges">
        <EdgeField
          id="mm-low"
          label={labels.low}
          q={edges.low}
          anchored={selection.low === 'spot'}
          market={pool.price}
          spacing={spacing}
          onCommit={(q) => commitEdge('low', q)}
        />
        <EdgeField
          id="mm-high"
          label={labels.high}
          q={edges.high}
          anchored={selection.high === 'spot'}
          market={pool.price}
          spacing={spacing}
          onCommit={(q) => commitEdge('high', q)}
        />
      </div>
      {error ? (
        <p className="err small" role="alert">
          {error}
        </p>
      ) : (
        <p className="mm-range-note">
          Type a price, a change like <kbd>+25%</kbd> or a multiple like <kbd>3x</kbd>. Arrow keys nudge one pool step (
          {((1.0001 ** spacing - 1) * 100).toFixed(2)}%), Shift for ten. An edge at the market follows it as it moves.
        </p>
      )}
    </section>
  )
}

/* --- edge inputs ----------------------------------------------------------------------------------------- */

function EdgeField({
  id,
  label,
  q,
  anchored,
  market,
  spacing,
  onCommit,
}: {
  id: string
  label: string
  q: number
  anchored: boolean
  market: number
  spacing: number
  onCommit: (q: number) => void
}) {
  const [draft, setDraft] = useState<string>()
  const [bad, setBad] = useState(false)
  const price = edgePrice(q, spacing)
  const shown = formatPrice(price)
  const commit = () => {
    if (draft === undefined) return
    const parsed = parsePrice(draft, market)
    const next = parsed === undefined ? undefined : stepForPrice(parsed, spacing)
    setDraft(undefined)
    setBad(next === undefined && draft.trim() !== '')
    if (next !== undefined) onCommit(next)
  }
  const nudge = (steps: number) => {
    setDraft(undefined)
    setBad(false)
    onCommit(q + steps * spacing)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commit()
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      setDraft(undefined)
      e.currentTarget.blur()
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      nudge((e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1))
    }
  }
  return (
    <div className="mm-edge">
      <label htmlFor={id}>{label}</label>
      <div className="mm-edge-input">
        <button type="button" className="mm-step" aria-label={`${label}: one step lower`} onClick={(e) => nudge(e.shiftKey ? -10 : -1)}>
          −
        </button>
        <input
          id={id}
          className="input num"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={bad}
          aria-describedby={`${id}-meta`}
          value={draft ?? shown}
          onFocus={(e) => {
            setDraft(shown)
            e.currentTarget.select()
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
        />
        <span className="unit">ETH</span>
        <button type="button" className="mm-step" aria-label={`${label}: one step higher`} onClick={(e) => nudge(e.shiftKey ? 10 : 1)}>
          +
        </button>
      </div>
      <div className="mm-edge-meta" id={`${id}-meta`}>
        <span className="num">{bad ? 'Not a price — kept the previous one' : formatFromMarket(price, market)}</span>
        {anchored && <span className="mm-anchor">Follows the market</span>}
      </div>
    </div>
  )
}

/* --- liquidity chart --------------------------------------------------------------------------------------- */

const H = 236
const TOP = 34
const BASE = 196
type View = { from: number; to: number }
type Drag = { kind: 'low' | 'high' | 'range' | 'pan'; x0: number; view: View; low: number; high: number; moved: boolean }

function clampView(v: View, spacing: number): View {
  const max = maxStep(spacing)
  const span = Math.min(Math.max(v.to - v.from, spacing * 4), 2 * max)
  const from = Math.max(-max, Math.min(v.from, max - span))
  return { from, to: from + span }
}

/** A view around the range and the market; open-ended edges are capped so the interesting part stays readable. */
function fitView(low: number, high: number, at: number, spacing: number): View {
  const cap = stepOfPrice(50)
  const a = Math.max(Math.min(low, at), at - cap)
  const b = Math.min(Math.max(high, at), at + cap)
  const span = Math.max(b - a, spacing * 8)
  const mid = (a + b) / 2
  return clampView({ from: mid - span * 0.62, to: mid + span * 0.62 }, spacing)
}

const zoomAt = (v: View, q: number, factor: number): View => ({ from: q - (q - v.from) * factor, to: q + (v.to - q) * factor })

function RangeChart({
  pool,
  spacing,
  selection,
  onChange,
  edges,
  labels,
  valid,
  mine,
  others,
  fitSignal,
}: {
  pool: PoolData
  spacing: number
  selection: RangeSelection
  onChange: (selection: RangeSelection) => void
  edges: { low: number; high: number }
  labels: { low: string; high: string }
  valid: boolean
  mine?: Range
  others?: { tickLower: number; tickUpper: number }[]
  fitSignal: number
}) {
  const sqrtP = pool.sqrtPriceX96
  const at = spotSteps(sqrtP, spacing).at
  const wrap = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<Drag>()
  const [width, setWidth] = useState(0)
  const [view, setView] = useState(() => fitView(edges.low, edges.high, at, spacing))
  const [hover, setHover] = useState<number>()
  const [dragging, setDragging] = useState<Drag['kind']>()
  const span = view.to - view.from
  const X = (q: number) => ((q - view.from) / span) * width
  const Q = (x: number) => view.from + (x / width) * span

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Re-fit on request (mode and quick-range picks).
  // biome-ignore lint/correctness/useExhaustiveDependencies: fitSignal is the trigger; edges are read at that moment.
  useEffect(() => {
    if (fitSignal) setView(fitView(edges.low, edges.high, at, spacing))
  }, [fitSignal])

  // A typed edge outside the view brings the view to it (never while dragging).
  // biome-ignore lint/correctness/useExhaustiveDependencies: only edge changes should move the view.
  useEffect(() => {
    if (drag.current) return
    setView((v) => {
      const cap = stepOfPrice(50)
      const lowOut = edges.low < v.from && edges.low > at - cap
      const highOut = edges.high > v.to && edges.high < at + cap
      return lowOut || highOut ? fitView(edges.low, edges.high, at, spacing) : v
    })
  }, [edges.low, edges.high])

  // Pinch / ctrl-wheel zooms at the cursor; horizontal wheel pans. Plain vertical wheel keeps scrolling the page.
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      const rect = el.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        setView((v) => {
          const q = v.from + ((e.clientX - rect.left) / rect.width) * (v.to - v.from)
          return clampView(zoomAt(v, q, Math.exp(e.deltaY * 0.01)), spacing)
        })
      } else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault()
        setView((v) => {
          const d = (e.deltaX / rect.width) * (v.to - v.from)
          return clampView({ from: v.from + d, to: v.to + d }, spacing)
        })
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [spacing])

  // Pool liquidity as a step function over ticks: levels[i] holds on [ticks[i], ticks[i + 1]).
  const steps = useMemo(() => {
    const ticks = [...new Set(pool.ranges.flatMap((r) => [r.tickLower, r.tickUpper]))].sort((a, b) => a - b)
    return { ticks, levels: ticks.map((t) => liquidityAt(pool.ranges, t)) }
  }, [pool.ranges])

  const bars = useMemo(() => {
    if (!width) return []
    const n = Math.max(24, Math.min(160, Math.round(width / 7)))
    const w = span / n
    return Array.from({ length: n }, (_, i) => {
      const qa = view.from + i * w
      const qb = qa + w
      // Ticks covered by this bar: [t0, t1). The tallest level inside wins so narrow ranges stay visible.
      const t0 = Math.ceil(-qb)
      const t1 = -qa
      let level = 0n
      for (let k = 0; k < steps.ticks.length; k++) {
        const end = k + 1 < steps.ticks.length ? steps.ticks[k + 1] : Number.POSITIVE_INFINITY
        if (steps.ticks[k] < t1 && end > t0 && steps.levels[k] > level) level = steps.levels[k]
      }
      const own = mine && mine.tickLower < t1 && mine.tickUpper > t0 ? mine.liquidity : 0n
      return { qa, qb, t0, t1, level, own }
    })
  }, [width, view.from, span, steps, mine])
  const top = bars.reduce((m, b) => Math.max(m, Number(b.level + b.own)), 0)
  const Y = (l: bigint) => (top > 0 ? ((BASE - TOP - 6) * Number(l)) / top : 0)

  const hovered = useMemo(() => {
    if (hover === undefined || dragging) return undefined
    const bar = bars.find((b) => hover >= b.qa && hover < b.qb)
    if (!bar) return undefined
    const tA = Math.floor(bar.t0)
    const tB = Math.max(tA + 1, Math.ceil(bar.t1))
    return {
      q: hover,
      pool: bandDepth(sqrtP, pool.ranges, tA, tB),
      own: mine ? bandDepth(sqrtP, [mine], tA, tB) : undefined,
    }
  }, [hover, dragging, bars, sqrtP, pool.ranges, mine])

  const local = (e: PointerEvent) => e.clientX - (svg.current?.getBoundingClientRect().left ?? 0)
  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    const target = (e.target as Element).closest('[data-drag]')?.getAttribute('data-drag')
    const kind: Drag['kind'] = target === 'low' || target === 'high' || target === 'range' ? target : 'pan'
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { kind, x0: e.clientX, view, low: edges.low, high: edges.high, moved: false }
    setDragging(kind)
  }
  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current
    if (!d) {
      setHover(Q(local(e)))
      return
    }
    const dx = e.clientX - d.x0
    if (Math.abs(dx) > 2) d.moved = true
    if (!d.moved) return
    const dq = (dx / width) * (d.view.to - d.view.from)
    if (d.kind === 'pan') setView(clampView({ from: d.view.from - dq, to: d.view.to - dq }, spacing))
    else if (d.kind === 'range') onChange(shiftRange(sqrtP, d, dq, spacing))
    else onChange(setEdge(sqrtP, selection, d.kind, Q(Math.max(0, Math.min(width, local(e)))), spacing))
  }
  const onPointerUp = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current
    drag.current = undefined
    setDragging(undefined)
    // A click on empty chart moves the nearer edge there.
    if (d && d.kind === 'pan' && !d.moved) {
      const q = Q(local(e))
      onChange(setEdge(sqrtP, selection, Math.abs(q - edges.low) <= Math.abs(q - edges.high) ? 'low' : 'high', q, spacing))
    }
  }
  const onHandleKey = (which: 'low' | 'high') => (e: KeyboardEvent<SVGGElement>) => {
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0
    const page = e.key === 'PageUp' ? 10 : e.key === 'PageDown' ? -10 : 0
    const n = page || dir * (e.shiftKey ? 10 : 1)
    if (!n) return
    e.preventDefault()
    onChange(setEdge(sqrtP, selection, which, edges[which] + n * spacing, spacing))
  }

  const xLow = X(edges.low)
  const xHigh = X(edges.high)
  const xs = { low: Math.max(0, Math.min(width, xLow)), high: Math.max(0, Math.min(width, xHigh)) }
  const xSpot = X(at)
  // The MARKET tag slides to stay inside the chart when the price sits near an edge.
  const tagDx = Math.max(27, Math.min(width - 27, xSpot)) - xSpot
  const axis = [0.1, 0.3, 0.5, 0.7, 0.9].map((f) => view.from + span * f)

  const handle = (which: 'low' | 'high') => {
    const raw = which === 'low' ? xLow : xHigh
    const x = xs[which]
    const off = raw < 0 ? '◀ ' : raw > width ? ' ▶' : ''
    const price = edgePrice(edges[which], spacing)
    const text = `${off === '◀ ' ? off : ''}${formatPrice(price)}${off === ' ▶' ? off : ''}`
    const w = text.length * 6.6 + 14
    // Low labels hang left of the line and high labels right, unless that would leave the chart.
    const left = which === 'low' ? x - w >= 0 : x + w > width
    return (
      <g
        key={which}
        className={`rc-handle ${which}${off ? ' off' : ''}`}
        data-drag={which}
        transform={`translate(${x} 0)`}
        tabIndex={0}
        role="slider"
        aria-label={labels[which]}
        aria-valuemin={-maxStep(spacing)}
        aria-valuemax={maxStep(spacing)}
        aria-valuenow={edges[which]}
        aria-valuetext={`${formatPrice(price)} ETH, ${formatFromMarket(price, pool.price)}`}
        onKeyDown={onHandleKey(which)}
      >
        <rect className="rc-hit" x={-10} y={TOP - 26} width={20} height={BASE - TOP + 26} />
        <line y1={TOP - 4} y2={BASE} />
        <rect className="rc-grip" x={-5} y={(TOP + BASE) / 2 - 17} width={10} height={34} rx={3} />
        <path className="rc-grip-lines" d={`M-1.5 ${(TOP + BASE) / 2 - 7}v14M1.5 ${(TOP + BASE) / 2 - 7}v14`} />
        <g transform={`translate(${left ? -w : 0} ${TOP - 26})`}>
          <rect className="rc-tag" width={w} height={20} rx={3} />
          <text className="rc-tag-text" x={w / 2} y={14} textAnchor="middle">
            {text}
          </text>
        </g>
      </g>
    )
  }

  return (
    <div className="rc">
      <div className="rc-tools">
        <span className="rc-hint">Drag the handles or the band · drag the chart to pan · click to move the nearer edge</span>
        <fieldset className="rc-zoom">
          <legend className="sr-only">Chart view</legend>
          <button type="button" aria-label="Zoom out" onClick={() => setView((v) => clampView(zoomAt(v, (v.from + v.to) / 2, 1.6), spacing))}>
            −
          </button>
          <button type="button" aria-label="Zoom in" onClick={() => setView((v) => clampView(zoomAt(v, (v.from + v.to) / 2, 1 / 1.6), spacing))}>
            +
          </button>
          <button type="button" onClick={() => setView(fitView(edges.low, edges.high, at, spacing))}>
            Fit range
          </button>
          <button
            type="button"
            disabled={!steps.ticks.length}
            onClick={() => setView(fitView(-steps.ticks[steps.ticks.length - 1], -steps.ticks[0], at, spacing))}
          >
            All liquidity
          </button>
        </fieldset>
      </div>
      <div className="rc-frame" ref={wrap}>
        {width > 0 && (
          // biome-ignore lint/a11y/noSvgWithoutTitle: aria-label names the chart; a <title> would add a native tooltip over the custom one.
          <svg
            aria-label="Pool liquidity by price, with your range"
            ref={svg}
            className={`rc-svg${dragging ? ` dragging-${dragging}` : ''}`}
            width={width}
            height={H}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              drag.current = undefined
              setDragging(undefined)
            }}
            onPointerLeave={() => setHover(undefined)}
          >
            <rect className="rc-bg" width={width} height={H} />
            {axis.map((q) => (
              <line key={q} className="rc-grid" x1={X(q)} x2={X(q)} y1={TOP} y2={BASE} />
            ))}
            {bars.map((b) => {
              const x = X(b.qa)
              const bw = X(b.qb) - x
              const hp = Y(b.level)
              const ho = Y(b.own)
              const mid = (b.qa + b.qb) / 2
              const cls = `${mid < at ? 'bid' : 'ask'}${mid >= edges.low && mid <= edges.high ? ' in' : ''}`
              return (
                <g key={b.qa}>
                  {hp > 0 && <rect className={`rc-bar ${cls}`} x={x} y={BASE - hp} width={bw} height={hp} />}
                  {ho > 0 && <rect className="rc-bar mine" x={x} y={BASE - hp - ho} width={bw} height={ho} />}
                </g>
              )
            })}
            <rect
              className={`rc-range${valid ? '' : ' invalid'}`}
              data-drag="range"
              x={Math.min(xs.low, xs.high)}
              y={TOP - 4}
              width={Math.max(0, xs.high - xs.low)}
              height={BASE - TOP + 4}
            />
            {!top && (
              <text className="rc-empty" x={width / 2} y={(TOP + BASE) / 2} textAnchor="middle">
                No liquidity at these prices yet
              </text>
            )}
            {others?.map((p) => {
              const a = Math.max(0, X(-p.tickUpper))
              const z = Math.min(width, X(-p.tickLower))
              return z > a ? <rect key={`${p.tickLower}:${p.tickUpper}`} className="rc-other" x={a} y={BASE + 3} width={z - a} height={3} /> : null
            })}
            <line className="rc-base" x1={0} x2={width} y1={BASE} y2={BASE} />
            {xSpot >= 0 && xSpot <= width && (
              <g className="rc-spot" transform={`translate(${xSpot} 0)`}>
                <line y1={TOP - 8} y2={BASE + 8} />
                <rect x={tagDx - 27} y={BASE + 8} width={54} height={15} rx={2} />
                <text x={tagDx} y={BASE + 19} textAnchor="middle">
                  MARKET
                </text>
              </g>
            )}
            {axis.map((q) => (
              <text key={q} className="rc-axis" x={X(q)} y={H - 2} textAnchor="middle">
                {formatPrice(edgePrice(q, spacing))}
              </text>
            ))}
            {handle('low')}
            {handle('high')}
          </svg>
        )}
        {hovered && width > 0 && (
          <div className="rc-tip" style={{ left: Math.min(width - 190, Math.max(0, X(hovered.q) + 12)) }}>
            <b className="num">{formatPrice(edgePrice(hovered.q, spacing))} ETH</b>
            <span>{formatFromMarket(edgePrice(hovered.q, spacing), pool.price)}</span>
            <span>
              Pool: {hovered.pool.fremy ? `${fmt(hovered.pool.fremy, 18, 3)} fREMY` : ''}
              {hovered.pool.fremy && hovered.pool.eth ? ' + ' : ''}
              {hovered.pool.eth ? `${fmt(hovered.pool.eth, 18, 5)} ETH` : ''}
              {!hovered.pool.fremy && !hovered.pool.eth ? 'empty' : ''}
            </span>
            {hovered.own && (hovered.own.fremy > 0n || hovered.own.eth > 0n) && (
              <span className="mine">
                Yours: {hovered.own.fremy ? `${fmt(hovered.own.fremy, 18, 3)} fREMY` : ''}
                {hovered.own.fremy && hovered.own.eth ? ' + ' : ''}
                {hovered.own.eth ? `${fmt(hovered.own.eth, 18, 5)} ETH` : ''}
              </span>
            )}
          </div>
        )}
      </div>
      <ul className="rc-legend">
        <li>
          <i className="ask" /> fREMY offered (asks)
        </li>
        <li>
          <i className="bid" /> ETH bids
        </li>
        <li>
          <i className="mine" /> Your new position
        </li>
        {!!others?.length && (
          <li>
            <i className="other" /> Your open positions
          </li>
        )}
      </ul>
    </div>
  )
}
