import { useLayoutEffect, useRef, useState } from 'react'
import { player, usePlayer } from '../player/player'
import { EQ_FREQS, type EqState } from '../player/types'
import { SPRITES } from '../skin/sprites'
import { balanceText, snapBalance, volumeText } from './controls'
import { Btn, type SpriteKey, sprite, usePress, useSkin } from './skin'
import { below, useUi } from './ui'
import { setMessage, slideValue, track } from './util'

const FREQ_LABEL = EQ_FREQS.map((f) => (f >= 1000 ? `${f / 1000}KHZ` : `${f}HZ`))
const db = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)} DB`

/** Equalizer: 275×116 with ON/AUTO, presets, response graph, preamp and ten bands (or the 275×14 windowshade). */
export function EqWindow() {
  const ui = useUi()
  const skin = useSkin()
  const eq = usePlayer((s) => s.eq)
  const { layout } = ui
  const active = ui.isActive('eq')
  const e = (name: SpriteKey<'EQMAIN'>) => sprite(skin, 'EQMAIN', name)
  const x = (name: SpriteKey<'EQ_EX'>) => sprite(skin, 'EQ_EX', name)
  const pos = layout.pos.eq

  if (layout.shade.eq)
    return (
      <div
        className="wa-win"
        style={{ left: pos.x, top: pos.y, ...x(active ? 'EQ_SHADE_BACKGROUND_SELECTED' : 'EQ_SHADE_BACKGROUND') }}
        onPointerDown={(ev) => ui.grab('eq', ev)}
        onDoubleClick={() => ui.toggleShade('eq')}
      >
        <ShadeSlider kind="volume" />
        <ShadeSlider kind="balance" />
        <Btn
          x={254}
          y={3}
          w={9}
          h={9}
          down={x('EQ_MINIMIZE_BUTTON_ACTIVE')}
          title="Normal mode"
          onClick={() => ui.toggleShade('eq')}
        />
        <Btn
          x={264}
          y={3}
          w={9}
          h={9}
          down={x('EQ_SHADE_CLOSE_BUTTON_ACTIVE')}
          title="Close"
          onClick={() => ui.toggleWindow('eq')}
        />
      </div>
    )

  const set = (patch: Partial<EqState>) => player.setEq(patch)
  return (
    <div
      className="wa-win"
      style={{ left: pos.x, top: pos.y, ...e('EQ_WINDOW_BACKGROUND') }}
      onPointerDown={(ev) => ui.grab('eq', ev)}
    >
      <div
        className="wa-abs"
        style={{ left: 0, top: 0, ...e(active ? 'EQ_TITLE_BAR_SELECTED' : 'EQ_TITLE_BAR') }}
        onDoubleClick={() => ui.toggleShade('eq')}
      />
      <Btn
        x={254}
        y={3}
        w={9}
        h={9}
        down={x('EQ_MAXIMIZE_BUTTON_ACTIVE')}
        title="Windowshade mode"
        onClick={() => ui.toggleShade('eq')}
      />
      <Btn
        x={264}
        y={3}
        w={9}
        h={9}
        down={e('EQ_CLOSE_BUTTON_ACTIVE')}
        title="Close"
        onClick={() => ui.toggleWindow('eq')}
      />
      <Switch
        x={14}
        w={26}
        on={eq.on}
        base="EQ_ON_BUTTON"
        title="Toggle equalizer"
        onClick={() => set({ on: !eq.on })}
      />
      <Switch
        x={40}
        w={32}
        on={eq.auto}
        base="EQ_AUTO_BUTTON"
        title="Toggle auto-load presets"
        onClick={() => set({ auto: !eq.auto })}
      />
      <Btn
        x={217}
        y={18}
        w={44}
        h={12}
        up={e('EQ_PRESETS_BUTTON')}
        down={e('EQ_PRESETS_BUTTON_SELECTED')}
        title="Presets"
        onClick={(ev) =>
          ui.openMenu(...below(ev), [
            {
              label: 'Load',
              items: player.presets.map((p) => ({
                label: p.name,
                onClick: () => set({ preamp: p.preamp, bands: [...p.bands] }),
              })),
            },
            '-',
            { label: 'Reset to flat', onClick: () => set({ preamp: 0, bands: EQ_FREQS.map(() => 0) }) },
          ])
        }
      />
      <Graph eq={eq} />
      <Band x={21} value={eq.preamp} label="PREAMP" onChange={(v) => set({ preamp: v })} />
      {eq.bands.map((v, i) => (
        <Band
          key={EQ_FREQS[i]}
          x={78 + 18 * i}
          value={v}
          label={`EQ: ${FREQ_LABEL[i]}`}
          onChange={(nv) => {
            const bands = [...player.getState().eq.bands]
            bands[i] = nv
            set({ bands })
          }}
        />
      ))}
      <Btn x={45} y={36} w={22} h={8} title="+12 dB" onClick={() => set({ bands: EQ_FREQS.map(() => 12) })} />
      <Btn x={45} y={64} w={22} h={8} title="0 dB" onClick={() => set({ bands: EQ_FREQS.map(() => 0) })} />
      <Btn x={45} y={95} w={22} h={8} title="-12 dB" onClick={() => set({ bands: EQ_FREQS.map(() => -12) })} />
    </div>
  )
}

function Switch(p: {
  x: number
  w: number
  on: boolean
  base: 'EQ_ON_BUTTON' | 'EQ_AUTO_BUTTON'
  title: string
  onClick: () => void
}) {
  const skin = useSkin()
  const { pressed, handlers } = usePress()
  const key = `${p.base}${p.on ? '_SELECTED' : ''}${pressed ? '_DEPRESSED' : ''}` as SpriteKey<'EQMAIN'>
  return (
    <button
      type="button"
      tabIndex={-1}
      className="wa-btn"
      title={p.title}
      aria-label={p.title}
      style={{ left: p.x, top: 18, ...sprite(skin, 'EQMAIN', key), width: p.w }}
      onClick={p.onClick}
      {...handlers}
    />
  )
}

/** Vertical EQ slider, 14×63: the background frame follows the value; dB −12 (bottom) .. +12 (top). */
function Band(p: { x: number; value: number; label: string; onChange: (db: number) => void }) {
  const skin = useSkin()
  const [held, setHeld] = useState(false)
  const v = (p.value + 12) / 24
  const frame = Math.round(v * 27)
  const [sx, sy] = SPRITES.EQMAIN.EQ_SLIDER_BACKGROUND
  const set = (ev: { clientX: number; clientY: number }, el: Element) => {
    const value = Math.round((1 - slideValue(ev, el, 'y', 63, 11, 51)) * 240 - 120) / 10
    p.onChange(value)
    setMessage(`${p.label}: ${db(value)}`)
  }
  return (
    <div
      className="wa-abs wa-c wa-slider"
      title={p.label}
      style={{
        left: p.x,
        top: 38,
        width: 14,
        height: 63,
        backgroundImage: `url(${skin.sheets.EQMAIN.url})`,
        backgroundPosition: `-${sx + (frame % 14) * 15}px -${sy + Math.floor(frame / 14) * 65}px`,
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        const el = e.currentTarget
        setHeld(true)
        set(e, el)
        track(
          e,
          (ev) => set(ev, el),
          () => {
            setHeld(false)
            setMessage()
          },
        )
      }}
    >
      <div
        className="wa-abs"
        style={{
          left: 1,
          top: Math.round((1 - v) * 51),
          ...sprite(skin, 'EQMAIN', held ? 'EQ_SLIDER_THUMB_SELECTED' : 'EQ_SLIDER_THUMB'),
        }}
      />
    </div>
  )
}

/** Natural cubic spline through (xs, ys), sampled at every integer x from xs[0] to the last x. */
function spline(xs: number[], ys: number[]): number[] {
  const n = xs.length
  const h = xs.slice(1).map((x, i) => x - xs[i])
  const alpha = new Array<number>(n).fill(0)
  for (let i = 1; i < n - 1; i++) alpha[i] = (3 / h[i]) * (ys[i + 1] - ys[i]) - (3 / h[i - 1]) * (ys[i] - ys[i - 1])
  const l = new Array<number>(n).fill(1)
  const mu = new Array<number>(n).fill(0)
  const z = new Array<number>(n).fill(0)
  for (let i = 1; i < n - 1; i++) {
    l[i] = 2 * (xs[i + 1] - xs[i - 1]) - h[i - 1] * mu[i - 1]
    mu[i] = h[i] / l[i]
    z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i]
  }
  const c = new Array<number>(n).fill(0)
  const b = new Array<number>(n).fill(0)
  const d = new Array<number>(n).fill(0)
  for (let j = n - 2; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1]
    b[j] = (ys[j + 1] - ys[j]) / h[j] - (h[j] * (c[j + 1] + 2 * c[j])) / 3
    d[j] = (c[j + 1] - c[j]) / (3 * h[j])
  }
  const out: number[] = []
  for (let x = xs[0], j = 0; x <= xs[n - 1]; x++) {
    while (j < n - 2 && x > xs[j + 1]) j++
    const t = x - xs[j]
    out.push(ys[j] + b[j] * t + c[j] * t * t + d[j] * t * t * t)
  }
  return out
}

/** 113×19 response graph: the preamp line and a spline through the bands in EQ_GRAPH_LINE_COLORS. */
function Graph({ eq }: { eq: EqState }) {
  const skin = useSkin()
  const ref = useRef<HTMLCanvasElement>(null)
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    const sheet = skin.sheets.EQMAIN.canvas
    ctx.clearRect(0, 0, 113, 19)
    const [px, py, pw] = SPRITES.EQMAIN.EQ_PREAMP_LINE
    ctx.drawImage(sheet, px, py, pw, 1, 0, Math.round(((eq.preamp + 12) / 24) * 18), pw, 1)
    const [lx, ly] = SPRITES.EQMAIN.EQ_GRAPH_LINE_COLORS
    const colors = sheet.getContext('2d')?.getImageData(lx, ly, 1, 19).data
    const ys = eq.bands.map((v) => ((12 - v) / 24) * 18)
    const all = spline(
      eq.bands.map((_, i) => i * 12),
      ys,
    )
    let last = Math.round(ys[0])
    all.forEach((fy, x) => {
      const y = Math.min(18, Math.max(0, Math.round(fy)))
      for (let row = Math.min(y, last); row <= Math.max(y, last); row++) {
        ctx.fillStyle = colors ? `rgb(${colors[row * 4]},${colors[row * 4 + 1]},${colors[row * 4 + 2]})` : '#fff'
        ctx.fillRect(2 + x, row, 1, 1)
      }
      last = y
    })
  }, [skin, eq])
  return (
    <div className="wa-abs" style={{ left: 86, top: 17, ...sprite(skin, 'EQMAIN', 'EQ_GRAPH_BACKGROUND') }}>
      <canvas ref={ref} className="wa-abs wa-vis" width={113} height={19} style={{ left: 0, top: 0 }} />
    </div>
  )
}

/** Windowshade volume (97 px) / balance (43 px) bars: a 3×7 thumb whose sprite shows left/centre/right. */
function ShadeSlider({ kind }: { kind: 'volume' | 'balance' }) {
  const skin = useSkin()
  const value = usePlayer((s) => (kind === 'volume' ? s.volume / 100 : (s.balance + 100) / 200))
  const size = kind === 'volume' ? 97 : 43
  const third = value < 1 / 3 ? 'LEFT' : value < 2 / 3 ? 'CENTER' : 'RIGHT'
  const key = `EQ_SHADE_${kind === 'volume' ? 'VOLUME' : 'BALANCE'}_SLIDER_${third}` as SpriteKey<'EQ_EX'>
  const set = (ev: { clientX: number; clientY: number }, el: Element) => {
    const f = slideValue(ev, el, 'x', size, 3)
    if (kind === 'volume') {
      player.setVolume(Math.round(f * 100))
      setMessage(volumeText(f * 100))
    } else {
      const b = snapBalance(f * 200 - 100)
      player.setBalance(b)
      setMessage(balanceText(b))
    }
  }
  return (
    <div
      className="wa-abs wa-c wa-slider"
      title={kind === 'volume' ? 'Volume Bar' : 'Panning Bar'}
      style={{ left: kind === 'volume' ? 61 : 164, top: 4, width: size, height: 7 }}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        const el = e.currentTarget
        set(e, el)
        track(
          e,
          (ev) => set(ev, el),
          () => setMessage(),
        )
      }}
    >
      <div className="wa-abs" style={{ left: Math.round(value * (size - 3)), top: 0, ...sprite(skin, 'EQ_EX', key) }} />
    </div>
  )
}
