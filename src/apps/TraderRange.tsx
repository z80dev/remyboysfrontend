import type { CSSProperties } from 'react'
import {
  type LiquidityMode,
  type RangeSelection,
  type RangeWidth,
  liquiditySelection,
  sliderMultiple,
  sliderSelection,
  sliderValue,
} from '../lib/liquidityRange'
import { ethPriceAtTick } from '../lib/v4math'

const price = (value: number) => (value < 0.01 ? value.toFixed(6) : value.toPrecision(4))
const relative = (multiple: number) => {
  const percent = Math.round((multiple - 1) * 100)
  return percent === 0 ? 'At the floor' : `${Math.abs(percent)}% ${percent > 0 ? 'above' : 'below'} floor`
}

const MODES: { id: LiquidityMode; name: string; asset: string; icon: string; description: string }[] = [
  {
    id: 'sell',
    name: 'Sell as price rises',
    asset: 'Deposit fREMY',
    icon: '↗',
    description: 'Your fREMY gradually sells for ETH as the price moves up through your range.',
  },
  {
    id: 'buy',
    name: 'Buy the dip',
    asset: 'Deposit ETH',
    icon: '↙',
    description: 'Your ETH gradually buys fREMY as the price moves down through your range.',
  },
  {
    id: 'both',
    name: 'Both sides',
    asset: 'Deposit fREMY + ETH',
    icon: '↔',
    description: 'Provide both tokens around the floor. Your balance shifts as traders buy and sell.',
  },
]

export function TraderRange({
  selection,
  onChange,
  floor,
  spacing,
  range,
  error,
}: {
  selection: RangeSelection
  onChange: (selection: RangeSelection) => void
  floor: number
  spacing: number
  range?: { tickLower: number; tickUpper: number }
  error?: string
}) {
  const mode = MODES.find((x) => x.id === selection.mode) ?? MODES[0]
  const minPrice = range ? ethPriceAtTick(range.tickUpper) : undefined
  const maxPrice = range ? ethPriceAtTick(range.tickLower) : undefined
  const minRatio = minPrice === undefined ? selection.minMultiple : minPrice / floor
  const maxRatio = maxPrice === undefined ? selection.maxMultiple : maxPrice / floor
  const lowStep = sliderValue(selection.minMultiple, spacing)
  const highStep = sliderValue(selection.maxMultiple, spacing)
  const limit = sliderValue(10, spacing)
  const bounds = {
    min: { min: selection.mode === 'sell' ? 0 : -limit, max: selection.mode === 'both' ? -2 : highStep - 2 },
    max: { min: selection.mode === 'both' ? 2 : lowStep + 2, max: selection.mode === 'buy' ? 0 : limit },
  }
  const plotMin = Math.min(0.1, minRatio / 1.1)
  const plotMax = Math.max(10, maxRatio * 1.1)
  const plot = (ratio: number) => (100 * Math.log(ratio / plotMin)) / Math.log(plotMax / plotMin)
  const plotStyle = {
    '--range-start': `${plot(minRatio)}%`,
    '--range-width': `${plot(maxRatio) - plot(minRatio)}%`,
    '--floor-at': `${plot(1)}%`,
  } as CSSProperties
  const toggleExact = () => {
    if (selection.exact) {
      onChange(range ? sliderSelection(minRatio, maxRatio, spacing) : liquiditySelection(selection.mode))
    } else {
      onChange({
        ...selection,
        exact: {
          min: String(Number((minPrice ?? floor * selection.minMultiple).toPrecision(10))),
          max: String(Number((maxPrice ?? floor * selection.maxMultiple).toPrecision(10))),
        },
      })
    }
  }

  return (
    <section className="mm-designer" aria-label="Liquidity range">
      <div className="mm-heading">
        <div>
          <span className="mm-eyebrow">MARKET MAKER</span>
          <h2>Build your range</h2>
        </div>
        <div className="mm-floor">
          <span>Current floor</span>
          <b className="num">
            {price(floor)} <small>ETH</small>
          </b>
        </div>
      </div>
      <fieldset className="mm-modes">
        <legend className="sr-only">Choose how to provide liquidity</legend>
        {MODES.map((x) => (
          <label key={x.id} className={`mm-mode${!selection.exact && selection.mode === x.id ? ' on' : ''}`}>
            <input
              type="radio"
              name="liquidity-mode"
              checked={!selection.exact && selection.mode === x.id}
              onChange={() => onChange(liquiditySelection(x.id))}
            />
            <span className="mm-mode-icon" aria-hidden="true">
              {x.icon}
            </span>
            <b>{x.name}</b>
            <small>{x.asset}</small>
          </label>
        ))}
      </fieldset>
      <p className="mm-explain">
        {selection.exact
          ? 'Set your own fixed prices. The tokens you need depend on where the floor sits in your range.'
          : mode.description}
      </p>
      <div className="mm-range-toolbar">
        <fieldset className="mm-widths">
          <legend className="sr-only">Range width</legend>
          {(['close', 'balanced', 'wide'] as RangeWidth[]).map((width) => {
            const target = liquiditySelection(selection.mode, width)
            const selected =
              !selection.exact &&
              target.minMultiple === selection.minMultiple &&
              target.maxMultiple === selection.maxMultiple
            return (
              <button
                type="button"
                key={width}
                className={`chip${selected ? ' on' : ''}`}
                aria-pressed={selected}
                onClick={() => onChange(target)}
              >
                {width === 'close' ? 'Close to floor' : width === 'balanced' ? 'Balanced' : 'Wide'}
              </button>
            )
          })}
        </fieldset>
        <button type="button" className="mm-exact-toggle" aria-pressed={!!selection.exact} onClick={toggleExact}>
          {selection.exact ? 'Use sliders' : 'Enter exact prices'}
        </button>
      </div>
      {range && (
        <div
          className="mm-range-plot"
          style={plotStyle}
          role="img"
          aria-label={`Your range is ${price(minPrice as number)} to ${price(maxPrice as number)} ETH. Current floor ${price(floor)} ETH.`}
        >
          <div className="mm-plot-labels">
            <span>Lower prices</span>
            <span>Higher prices</span>
          </div>
          <div className="mm-plot-track">
            <div className="mm-plot-selection" />
            <div className="mm-plot-floor">
              <span>Floor</span>
            </div>
          </div>
          <div className="mm-plot-labels num">
            <span>{plotMin.toPrecision(2)}×</span>
            <span>{plotMax.toPrecision(2)}× floor</span>
          </div>
        </div>
      )}
      <div className="mm-boundaries">
        {(['min', 'max'] as const).map((which) => {
          const lower = which === 'min'
          const value = lower ? minPrice : maxPrice
          const ratio = lower ? minRatio : maxRatio
          const title =
            selection.exact || selection.mode === 'both'
              ? lower
                ? 'Lower price'
                : 'Upper price'
              : selection.mode === 'sell'
                ? lower
                  ? 'Start selling'
                  : 'Finish selling'
                : lower
                  ? 'Finish buying'
                  : 'Start buying'
          return (
            <div className="mm-boundary" key={which}>
              <label htmlFor={`mm-${which}`}>
                {title}
                <span>{relative(ratio)}</span>
              </label>
              {selection.exact ? (
                <div className="mm-exact-input">
                  <input
                    id={`mm-${which}`}
                    className="input num"
                    inputMode="decimal"
                    value={selection.exact[which]}
                    onChange={(e) =>
                      onChange({
                        ...selection,
                        exact: {
                          ...(selection.exact as { min: string; max: string }),
                          [which]: e.target.value.replace(/[^0-9.]/g, ''),
                        },
                      })
                    }
                  />
                  <span>ETH</span>
                </div>
              ) : (
                <>
                  <div className="mm-boundary-price num">
                    {value === undefined ? '—' : price(value)} <small>ETH</small>
                  </div>
                  <input
                    id={`mm-${which}`}
                    type="range"
                    min={bounds[which].min}
                    max={bounds[which].max}
                    step={1}
                    value={lower ? lowStep : highStep}
                    aria-valuetext={`${value === undefined ? 'Unavailable' : `${price(value)} ETH`}, ${relative(ratio)}`}
                    onChange={(e) =>
                      onChange({
                        ...selection,
                        [lower ? 'minMultiple' : 'maxMultiple']: sliderMultiple(Number(e.target.value), spacing),
                      })
                    }
                  />
                </>
              )}
            </div>
          )
        })}
      </div>
      {error ? (
        <p className="err small" role="alert">
          {error}
        </p>
      ) : (
        <p className="mm-range-note">
          {selection.exact ? 'Exact prices stay fixed' : 'Sliders follow the live floor'} · Prices round to the nearest
          available pool step.
        </p>
      )}
    </section>
  )
}
