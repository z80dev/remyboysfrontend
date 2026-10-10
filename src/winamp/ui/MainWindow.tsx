import { type CSSProperties, type PointerEvent as ReactPointerEvent, useEffect, useState } from 'react'
import { player, usePlayer } from '../player/player'
import type { PlayerState } from '../player/types'
import type { Skin } from '../skin/types'
import { Visualizer } from './Visualizer'
import { MiniTime, balanceText, snapBalance, useDisplayTime, volumeText } from './controls'
import { Btn, type SpriteKey, Text, sprite, usePress, useSkin } from './skin'
import { below, useUi } from './ui'
import { mmss, setMessage, slideValue, track, useMessage, useTicker } from './util'

/** The classic 275×116 main window (or its 275×14 windowshade). */
export function MainWindow() {
  const ui = useUi()
  const skin = useSkin()
  const { layout } = ui
  const shade = layout.shade.main
  const active = ui.isActive('main')
  const t = (name: SpriteKey<'TITLEBAR'>) => sprite(skin, 'TITLEBAR', name)
  const cycleVis = () =>
    ui.setLayout((l) => ({ ...l, vis: l.vis === 'bars' ? 'osc' : l.vis === 'osc' ? 'off' : 'bars' }))

  const captionButtons = (
    <>
      <Btn
        x={6}
        y={3}
        w={9}
        h={9}
        down={t('MAIN_OPTIONS_BUTTON_DEPRESSED')}
        title="Main menu"
        onClick={(e) => ui.openMenu(...below(e), ui.mainMenu())}
      />
      <Btn
        x={244}
        y={3}
        w={9}
        h={9}
        down={t('MAIN_MINIMIZE_BUTTON_DEPRESSED')}
        title="Minimize"
        onClick={ui.minimize}
      />
      <Btn
        x={254}
        y={3}
        w={9}
        h={9}
        up={shade && active ? t('MAIN_SHADE_BUTTON_SELECTED') : undefined}
        down={t(shade ? 'MAIN_SHADE_BUTTON_SELECTED_DEPRESSED' : 'MAIN_SHADE_BUTTON_DEPRESSED')}
        title={shade ? 'Normal mode' : 'Windowshade mode'}
        onClick={() => ui.toggleShade('main')}
      />
      <Btn x={264} y={3} w={9} h={9} down={t('MAIN_CLOSE_BUTTON_DEPRESSED')} title="Close" onClick={ui.exit} />
    </>
  )

  if (shade)
    return (
      <div
        className="wa-win"
        style={{ left: layout.pos.main.x, top: layout.pos.main.y, width: 275, height: 14 }}
        onPointerDown={(e) => ui.grab('main', e)}
      >
        <div
          className="wa-abs"
          style={{ left: 0, top: 0, ...t(active ? 'MAIN_SHADE_BACKGROUND_SELECTED' : 'MAIN_SHADE_BACKGROUND') }}
          onDoubleClick={() => ui.toggleShade('main')}
        />
        {captionButtons}
        <Visualizer x={79} y={5} w={38} h={5} mode={layout.vis} onClick={cycleVis} title="Visualization" />
        <MiniTime x={127} y={4} />
        <Btn x={169} y={2} w={7} h={10} title="Previous" onClick={() => player.previous()} />
        <Btn x={176} y={2} w={10} h={10} title="Play" onClick={() => player.play()} />
        <Btn x={186} y={2} w={9} h={10} title="Pause" onClick={() => player.pause()} />
        <Btn x={195} y={2} w={9} h={10} title="Stop" onClick={() => player.stop()} />
        <Btn x={204} y={2} w={10} h={10} title="Next" onClick={() => player.next()} />
        <Btn x={215} y={2} w={10} h={10} title="Open file(s)" onClick={() => ui.openFiles(true)} />
        <ShadePosition />
      </div>
    )

  return (
    <div
      className="wa-win"
      style={{ left: layout.pos.main.x, top: layout.pos.main.y, ...sprite(skin, 'MAIN', 'MAIN_WINDOW_BACKGROUND') }}
      onPointerDown={(e) => ui.grab('main', e)}
    >
      <div
        className="wa-abs"
        style={{ left: 0, top: 0, ...t(active ? 'MAIN_TITLE_BAR_SELECTED' : 'MAIN_TITLE_BAR') }}
        onDoubleClick={() => ui.toggleShade('main')}
      />
      {captionButtons}
      <ClutterBar />
      <PlayStatus />
      <Time />
      <Visualizer x={24} y={43} w={76} h={16} mode={layout.vis} onClick={cycleVis} title="Visualization" />
      <Marquee />
      <MediaInfo />
      <Volume />
      <Balance />
      <WindowToggle x={219} which="eq" />
      <WindowToggle x={242} which="pl" />
      <Position />
      <Transport />
      <Toggle x={164} w={47} kind="shuffle" />
      <Toggle x={210} w={28} kind="repeat" />
      <Btn x={253} y={91} w={13} h={15} title="About Winamp" onClick={ui.about} />
    </div>
  )
}

function ClutterBar() {
  const ui = useUi()
  const skin = useSkin()
  const t = (name: SpriteKey<'TITLEBAR'>) => sprite(skin, 'TITLEBAR', name)
  const { alwaysOnTop, double } = ui.layout
  return (
    <>
      <div className="wa-abs" style={{ left: 10, top: 22, ...t('MAIN_CLUTTER_BAR_BACKGROUND') }} />
      <Btn
        x={10}
        y={25}
        w={8}
        h={8}
        down={t('MAIN_CLUTTER_BAR_BUTTON_O_SELECTED')}
        title="Options menu"
        onClick={(e) => ui.openMenu(...below(e), ui.optionsMenu())}
      />
      <Btn
        x={10}
        y={33}
        w={8}
        h={7}
        up={alwaysOnTop ? t('MAIN_CLUTTER_BAR_BUTTON_A_SELECTED') : undefined}
        down={t('MAIN_CLUTTER_BAR_BUTTON_A_SELECTED')}
        title="Toggle always on top"
        onClick={() => ui.setLayout((l) => ({ ...l, alwaysOnTop: !l.alwaysOnTop }))}
      />
      <Btn
        x={10}
        y={40}
        w={8}
        h={7}
        down={t('MAIN_CLUTTER_BAR_BUTTON_I_SELECTED')}
        title="File info"
        onClick={() => ui.fileInfo()}
      />
      <Btn
        x={10}
        y={47}
        w={8}
        h={8}
        up={double ? t('MAIN_CLUTTER_BAR_BUTTON_D_SELECTED') : undefined}
        down={t('MAIN_CLUTTER_BAR_BUTTON_D_SELECTED')}
        title="Toggle double size"
        onClick={ui.toggleDouble}
      />
      <Btn
        x={10}
        y={55}
        w={8}
        h={7}
        down={t('MAIN_CLUTTER_BAR_BUTTON_V_SELECTED')}
        title="Visualization menu"
        onClick={(e) => ui.openMenu(...below(e), ui.visMenu())}
      />
    </>
  )
}

function PlayStatus() {
  const skin = useSkin()
  const status = usePlayer((s) => s.status)
  const loading = usePlayer((s) => s.loading)
  const p = (name: SpriteKey<'PLAYPAUS'>) => sprite(skin, 'PLAYPAUS', name)
  const icon =
    status === 'playing'
      ? 'MAIN_PLAYING_INDICATOR'
      : status === 'paused'
        ? 'MAIN_PAUSED_INDICATOR'
        : 'MAIN_STOPPED_INDICATOR'
  return (
    <>
      <div className="wa-abs" style={{ left: 26, top: 28, ...p(icon) }} />
      {(status === 'playing' || loading) && (
        <div
          className="wa-abs"
          style={{
            left: 24,
            top: 28,
            ...p(loading ? 'MAIN_WORKING_INDICATOR' : 'MAIN_NOT_WORKING_INDICATOR'),
            width: 3,
          }}
        />
      )}
    </>
  )
}

/** NUMBERS (or NUMS_EX) digit. */
function digitStyle(skin: Skin, d: number): CSSProperties {
  const ex = skin.sheets.NUMS_EX
  return {
    backgroundImage: `url(${(ex ?? skin.sheets.NUMBERS).url})`,
    backgroundPosition: `-${d * 9}px 0`,
    width: 9,
    height: 13,
  }
}

function Time() {
  const ui = useUi()
  const skin = useSkin()
  const paused = usePlayer((s) => s.status === 'paused')
  const time = useDisplayTime()
  if (!time) return null
  const s = Math.floor(time.seconds)
  const m = Math.floor(s / 60) % 100
  const ex = skin.sheets.NUMS_EX
  const minus: CSSProperties = ex
    ? {
        backgroundImage: `url(${ex.url})`,
        backgroundPosition: time.minus ? '-99px 0' : '-90px 0',
        width: 9,
        height: 13,
        left: -1,
        top: 0,
      }
    : { ...sprite(skin, 'NUMBERS', time.minus ? 'MINUS_SIGN' : 'NO_MINUS_SIGN'), left: -1, top: 6 }
  return (
    <button
      type="button"
      tabIndex={-1}
      className={`wa-btn${paused ? ' wa-blink' : ''}`}
      style={{ left: 39, top: 26, width: 59, height: 13 }}
      title="Toggle elapsed/remaining time"
      onClick={() => ui.setLayout((l) => ({ ...l, remaining: !l.remaining }))}
    >
      <div className="wa-abs" style={minus} />
      {[
        [9, Math.floor(m / 10)],
        [21, m % 10],
        [39, Math.floor((s % 60) / 10)],
        [51, s % 10],
      ].map(([left, d]) => (
        <div key={left} className="wa-abs" style={{ left, top: 0, ...digitStyle(skin, d) }} />
      ))}
    </button>
  )
}

function songText(s: PlayerState): string {
  const i = s.current >= 0 ? s.current : s.tracks.length ? 0 : -1
  const track = s.tracks[i]
  if (!track) return 'WINAMP 2.91'
  if (s.error && i === s.current) return `${i + 1}. ${track.title} (${s.error})`
  const duration = i === s.current && s.duration > 0 ? s.duration : track.duration
  return `${i + 1}. ${track.title}${duration ? ` (${mmss(duration)})` : ''}`
}

const SEPARATOR = '  ***  '
const MARQUEE_CHARS = 31

/** Scrolling song title in TEXT.BMP; drag it to scroll by hand. Shows control feedback while something is dragged. */
function Marquee() {
  const message = useMessage()
  const title = usePlayer(songText)
  const text = message ?? title
  const long = !message && text.length >= MARQUEE_CHARS
  const cycle = (text.length + SEPARATOR.length) * 5
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [resting, setResting] = useState(false)

  // A new song starts scrolling from its beginning.
  const [scrolled, setScrolled] = useState(title)
  if (scrolled !== title) {
    setScrolled(title)
    setOffset(0)
  }
  useEffect(() => {
    if (!long || dragging || resting) return
    const t = window.setInterval(() => setOffset((o) => o + 5), 220)
    return () => window.clearInterval(t)
  }, [long, dragging, resting])
  useEffect(() => {
    if (!resting) return
    const t = window.setTimeout(() => setResting(false), 1000)
    return () => window.clearTimeout(t)
  }, [resting])

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return
    const scale = e.currentTarget.getBoundingClientRect().width / 154
    const x0 = e.clientX
    const start = offset
    setDragging(true)
    track(
      e,
      (ev) => setOffset(start - Math.round((ev.clientX - x0) / scale)),
      () => {
        setDragging(false)
        setResting(true)
      },
    )
  }

  const shown = long ? `${text}${SEPARATOR}${text}` : text.padEnd(MARQUEE_CHARS, ' ')
  const shift = long ? ((offset % cycle) + cycle) % cycle : 0
  return (
    <div
      className="wa-abs wa-marquee wa-c"
      style={{ left: 111, top: 24, width: 154, height: 12 }}
      title="Song title"
      onPointerDown={onPointerDown}
    >
      <Text text={shown} y={3} style={{ transform: `translateX(${-shift}px)` }} />
    </div>
  )
}

function MediaInfo() {
  const skin = useSkin()
  const stopped = usePlayer((s) => s.status === 'stopped')
  const info = usePlayer((s) => s.info)
  const m = (name: SpriteKey<'MONOSTER'>) => sprite(skin, 'MONOSTER', name)
  const on = !stopped && info
  return (
    <>
      {on && <Text text={String(info.kbps).padStart(3, ' ').slice(0, 3)} x={111} y={43} />}
      {on && <Text text={String(info.khz).padStart(2, ' ').slice(0, 2)} x={156} y={43} />}
      <div
        className="wa-abs"
        style={{ left: 212, top: 41, ...m(on && info.channels === 1 ? 'MAIN_MONO_SELECTED' : 'MAIN_MONO') }}
      />
      <div
        className="wa-abs"
        style={{ left: 239, top: 41, ...m(on && info.channels > 1 ? 'MAIN_STEREO_SELECTED' : 'MAIN_STEREO') }}
      />
    </>
  )
}

function Volume() {
  const skin = useSkin()
  const volume = usePlayer((s) => s.volume)
  const [held, setHeld] = useState(false)
  const bg = sprite(skin, 'VOLUME', 'MAIN_VOLUME_BACKGROUND')
  const frame = Math.round((volume / 100) * 27)
  const set = (ev: { clientX: number; clientY: number }, el: Element) => {
    const v = Math.round(slideValue(ev, el, 'x', 68, 14, 51) * 100)
    player.setVolume(v)
    setMessage(volumeText(v))
  }
  return (
    <div
      className="wa-abs wa-c wa-slider"
      title="Volume Bar"
      style={{ left: 107, top: 57, ...bg, height: 13, backgroundPosition: `0 -${frame * 15}px` }}
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
          left: Math.round((volume / 100) * 51),
          top: 1,
          ...sprite(skin, 'VOLUME', held ? 'MAIN_VOLUME_THUMB_SELECTED' : 'MAIN_VOLUME_THUMB'),
        }}
      />
    </div>
  )
}

function Balance() {
  const skin = useSkin()
  const balance = usePlayer((s) => s.balance)
  const [held, setHeld] = useState(false)
  const frame = Math.floor((Math.abs(balance) / 100) * 27)
  const set = (ev: { clientX: number; clientY: number }, el: Element) => {
    const b = snapBalance(slideValue(ev, el, 'x', 38, 14) * 200 - 100)
    player.setBalance(b)
    setMessage(balanceText(b))
  }
  return (
    <div
      className="wa-abs wa-c wa-slider"
      title="Panning Bar"
      style={{
        left: 177,
        top: 57,
        ...sprite(skin, 'BALANCE', 'MAIN_BALANCE_BACKGROUND'),
        height: 13,
        backgroundPosition: `-9px -${frame * 15}px`,
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
          left: Math.round(((balance + 100) / 200) * 24),
          top: 1,
          ...sprite(skin, 'BALANCE', held ? 'MAIN_BALANCE_THUMB_ACTIVE' : 'MAIN_BALANCE_THUMB'),
        }}
      />
    </div>
  )
}

function WindowToggle({ x, which }: { x: number; which: 'eq' | 'pl' }) {
  const ui = useUi()
  const skin = useSkin()
  const { pressed, handlers } = usePress()
  const open = ui.layout.open[which]
  const key =
    which === 'eq'
      ? pressed
        ? open
          ? 'MAIN_EQ_BUTTON_DEPRESSED_SELECTED'
          : 'MAIN_EQ_BUTTON_DEPRESSED'
        : open
          ? 'MAIN_EQ_BUTTON_SELECTED'
          : 'MAIN_EQ_BUTTON'
      : pressed
        ? open
          ? 'MAIN_PLAYLIST_BUTTON_DEPRESSED_SELECTED'
          : 'MAIN_PLAYLIST_BUTTON_DEPRESSED'
        : open
          ? 'MAIN_PLAYLIST_BUTTON_SELECTED'
          : 'MAIN_PLAYLIST_BUTTON'
  const title = which === 'eq' ? 'Toggle Graphical Equalizer' : 'Toggle Playlist Editor'
  return (
    <button
      type="button"
      tabIndex={-1}
      className="wa-btn"
      title={title}
      aria-label={title}
      style={{ left: x, top: 58, ...sprite(skin, 'SHUFREP', key) }}
      onClick={() => ui.toggleWindow(which)}
      {...handlers}
    />
  )
}

function Toggle({ x, w, kind }: { x: number; w: number; kind: 'shuffle' | 'repeat' }) {
  const skin = useSkin()
  const on = usePlayer((s) => s[kind])
  const { pressed, handlers } = usePress()
  const base = kind === 'shuffle' ? 'MAIN_SHUFFLE_BUTTON' : 'MAIN_REPEAT_BUTTON'
  const key = `${base}${on ? '_SELECTED' : ''}${pressed ? '_DEPRESSED' : ''}` as SpriteKey<'SHUFREP'>
  const title = kind === 'shuffle' ? 'Toggle Shuffle' : 'Toggle Repeat'
  return (
    <button
      type="button"
      tabIndex={-1}
      className="wa-btn"
      title={title}
      aria-label={title}
      style={{ left: x, top: 89, ...sprite(skin, 'SHUFREP', key), width: w }}
      onClick={() => (kind === 'shuffle' ? player.toggleShuffle() : player.toggleRepeat())}
      {...handlers}
    />
  )
}

function Transport() {
  const ui = useUi()
  const skin = useSkin()
  const c = (name: SpriteKey<'CBUTTONS'>) => sprite(skin, 'CBUTTONS', name)
  return (
    <>
      <Btn
        x={16}
        y={88}
        w={23}
        h={18}
        up={c('MAIN_PREVIOUS_BUTTON')}
        down={c('MAIN_PREVIOUS_BUTTON_ACTIVE')}
        title="Previous Track"
        onClick={() => player.previous()}
      />
      <Btn
        x={39}
        y={88}
        w={23}
        h={18}
        up={c('MAIN_PLAY_BUTTON')}
        down={c('MAIN_PLAY_BUTTON_ACTIVE')}
        title="Play"
        onClick={() => player.play()}
      />
      <Btn
        x={62}
        y={88}
        w={23}
        h={18}
        up={c('MAIN_PAUSE_BUTTON')}
        down={c('MAIN_PAUSE_BUTTON_ACTIVE')}
        title="Pause"
        onClick={() => player.pause()}
      />
      <Btn
        x={85}
        y={88}
        w={23}
        h={18}
        up={c('MAIN_STOP_BUTTON')}
        down={c('MAIN_STOP_BUTTON_ACTIVE')}
        title="Stop"
        onClick={() => player.stop()}
      />
      <Btn
        x={108}
        y={88}
        w={22}
        h={18}
        up={c('MAIN_NEXT_BUTTON')}
        down={c('MAIN_NEXT_BUTTON_ACTIVE')}
        title="Next Track"
        onClick={() => player.next()}
      />
      <Btn
        x={136}
        y={89}
        w={22}
        h={16}
        up={c('MAIN_EJECT_BUTTON')}
        down={c('MAIN_EJECT_BUTTON_ACTIVE')}
        title="Open File(s)"
        onClick={() => ui.openFiles(true)}
      />
    </>
  )
}

/** Seeking state shared by both position bars: shows "SEEK TO" while dragging, seeks on release. */
function useSeekDrag(size: number, thumb: number) {
  const duration = usePlayer((s) => s.duration)
  const seekable = usePlayer((s) => s.status !== 'stopped' && s.duration > 0)
  const [scrub, setScrub] = useState<number>()
  useTicker(seekable && scrub === undefined, 500)
  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0 || !seekable) return
    const el = e.currentTarget
    const at = (ev: { clientX: number; clientY: number }) => {
      const f = slideValue(ev, el, 'x', size, thumb)
      const pad = (s: number) =>
        `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`
      setScrub(f)
      setMessage(`SEEK TO: ${pad(f * duration)}/${pad(duration)} (${Math.round(f * 100)}%)`)
      return f
    }
    at(e)
    track(e, at, (ev) => {
      player.seek(at(ev) * duration)
      setScrub(undefined)
      setMessage()
    })
  }
  const value = scrub ?? (seekable ? Math.min(1, player.time() / duration) : 0)
  return { seekable, value, held: scrub !== undefined, onPointerDown }
}

function Position() {
  const skin = useSkin()
  const { seekable, value, held, onPointerDown } = useSeekDrag(248, 29)
  return (
    <div
      className="wa-abs wa-c wa-slider"
      title="Seeking Bar"
      style={{ left: 16, top: 72, ...sprite(skin, 'POSBAR', 'MAIN_POSITION_SLIDER_BACKGROUND') }}
      onPointerDown={onPointerDown}
    >
      {seekable && (
        <div
          className="wa-abs"
          style={{
            left: Math.round(value * 219),
            top: 0,
            ...sprite(skin, 'POSBAR', held ? 'MAIN_POSITION_SLIDER_THUMB_SELECTED' : 'MAIN_POSITION_SLIDER_THUMB'),
          }}
        />
      )}
    </div>
  )
}

function ShadePosition() {
  const skin = useSkin()
  const { seekable, value, onPointerDown } = useSeekDrag(17, 3)
  const thumb =
    value <= 1 / 3
      ? 'MAIN_SHADE_POSITION_THUMB_LEFT'
      : value >= 2 / 3
        ? 'MAIN_SHADE_POSITION_THUMB_RIGHT'
        : 'MAIN_SHADE_POSITION_THUMB'
  return (
    <div
      className="wa-abs wa-c wa-slider"
      title="Seeking Bar"
      style={{ left: 226, top: 4, ...sprite(skin, 'TITLEBAR', 'MAIN_SHADE_POSITION_BACKGROUND') }}
      onPointerDown={onPointerDown}
    >
      {seekable && (
        <div className="wa-abs" style={{ left: Math.round(value * 14), top: 0, ...sprite(skin, 'TITLEBAR', thumb) }} />
      )}
    </div>
  )
}
