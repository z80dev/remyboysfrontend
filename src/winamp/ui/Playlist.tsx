import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react'
import { player, usePlayer } from '../player/player'
import type { Track } from '../player/types'
import { Visualizer } from './Visualizer'
import { MiniTime } from './controls'
import { winSize } from './layout'
import { Btn, type SpriteKey, Text, sprite, useSkin } from './skin'
import { useUi } from './ui'
import { hmmss, mmss, slideValue, track } from './util'

const ROW = 13

type P = SpriteKey<'PLEDIT'>

/** Repeats a 25×20 / 12×29 / … tile sprite `count` times from (x, y) along one axis. */
function Tiles({
  name,
  x,
  y,
  count,
  step,
  axis,
}: { name: P; x: number; y: number; count: number; step: number; axis: 'x' | 'y' }) {
  const skin = useSkin()
  const style = sprite(skin, 'PLEDIT', name)
  return (
    <>
      {Array.from({ length: Math.max(0, count) }, (_, i) => (
        <div
          key={`${x + (axis === 'x' ? i * step : 0)},${y + (axis === 'y' ? i * step : 0)}`}
          className="wa-abs"
          style={{ left: x + (axis === 'x' ? i * step : 0), top: y + (axis === 'y' ? i * step : 0), ...style }}
        />
      ))}
    </>
  )
}

/** Moves the selected tracks by `delta` rows as a block (Winamp drag-reorder). */
function moved(ids: string[], selected: ReadonlySet<string>, delta: number): string[] {
  const idx = ids.flatMap((id, i) => (selected.has(id) ? [i] : []))
  if (!idx.length) return ids
  const d = Math.max(-idx[0], Math.min(ids.length - 1 - idx[idx.length - 1], delta))
  const out = new Array<string | undefined>(ids.length)
  for (const i of idx) out[i + d] = ids[i]
  const rest = ids.filter((id) => !selected.has(id))
  let r = 0
  for (let i = 0; i < out.length; i++) if (out[i] === undefined) out[i] = rest[r++]
  return out as string[]
}

/** Playlist editor: skinned frame in 25×29 steps, track list, flyout button menus, mini transport (or its windowshade). */
export function PlaylistWindow() {
  const ui = useUi()
  const skin = useSkin()
  const { layout } = ui
  const active = ui.isActive('pl')
  const [W, H] = winSize(layout, 'pl')
  const pos = layout.pos.pl
  const extra = layout.plSize[0]

  if (layout.shade.pl) return <PlaylistShade W={W} active={active} />

  const even = extra % 2 === 0
  const fill = (W - 150 - (even ? 25 : 0)) / 2
  const sel = (a: P, b: P) => (active ? b : a)
  const midTiles = (H - 58) / 29
  const bottomY = H - 38
  return (
    <div
      className="wa-win wa-pl"
      style={{ left: pos.x, top: pos.y, width: W, height: H, background: skin.pledit.normalBg }}
      onPointerDown={(e) => ui.grab('pl', e)}
    >
      <div
        className="wa-abs"
        style={{ left: 0, top: 0, width: W, height: 20 }}
        onDoubleClick={() => ui.toggleShade('pl')}
      >
        <div
          className="wa-abs"
          style={{
            left: 0,
            top: 0,
            ...sprite(skin, 'PLEDIT', sel('PLAYLIST_TOP_LEFT_CORNER', 'PLAYLIST_TOP_LEFT_SELECTED')),
          }}
        />
        {even && (
          <div
            className="wa-abs"
            style={{
              left: 25,
              top: 0,
              ...sprite(skin, 'PLEDIT', sel('PLAYLIST_TOP_TILE', 'PLAYLIST_TOP_TILE_SELECTED')),
              width: 12,
            }}
          />
        )}
        <Tiles
          name={sel('PLAYLIST_TOP_TILE', 'PLAYLIST_TOP_TILE_SELECTED')}
          x={even ? 37 : 25}
          y={0}
          count={fill / 25}
          step={25}
          axis="x"
        />
        <div
          className="wa-abs"
          style={{
            left: (even ? 37 : 25) + fill,
            top: 0,
            ...sprite(skin, 'PLEDIT', sel('PLAYLIST_TITLE_BAR', 'PLAYLIST_TITLE_BAR_SELECTED')),
          }}
        />
        {even && (
          <div
            className="wa-abs"
            style={{
              left: 137 + fill,
              top: 0,
              ...sprite(skin, 'PLEDIT', sel('PLAYLIST_TOP_TILE', 'PLAYLIST_TOP_TILE_SELECTED')),
              width: 13,
            }}
          />
        )}
        <Tiles
          name={sel('PLAYLIST_TOP_TILE', 'PLAYLIST_TOP_TILE_SELECTED')}
          x={W - 25 - fill}
          y={0}
          count={fill / 25}
          step={25}
          axis="x"
        />
        <div
          className="wa-abs"
          style={{
            left: W - 25,
            top: 0,
            ...sprite(skin, 'PLEDIT', sel('PLAYLIST_TOP_RIGHT_CORNER', 'PLAYLIST_TOP_RIGHT_CORNER_SELECTED')),
          }}
        />
        <Btn
          x={W - 21}
          y={3}
          w={9}
          h={9}
          down={sprite(skin, 'PLEDIT', 'PLAYLIST_COLLAPSE_SELECTED')}
          title="Windowshade mode"
          onClick={() => ui.toggleShade('pl')}
        />
        <Btn
          x={W - 11}
          y={3}
          w={9}
          h={9}
          down={sprite(skin, 'PLEDIT', 'PLAYLIST_CLOSE_SELECTED')}
          title="Close"
          onClick={() => ui.toggleWindow('pl')}
        />
      </div>
      <Tiles name="PLAYLIST_LEFT_TILE" x={0} y={20} count={midTiles} step={29} axis="y" />
      <Tiles name="PLAYLIST_RIGHT_TILE" x={W - 20} y={20} count={midTiles} step={29} axis="y" />
      <TrackList W={W} H={H} />
      <Tiles name="PLAYLIST_BOTTOM_TILE" x={125} y={bottomY} count={(W - 275) / 25} step={25} axis="x" />
      <div
        className="wa-abs"
        style={{ left: 0, top: bottomY, ...sprite(skin, 'PLEDIT', 'PLAYLIST_BOTTOM_LEFT_CORNER') }}
      />
      {extra > 2 && (
        <div
          className="wa-abs"
          style={{ left: W - 225, top: bottomY, ...sprite(skin, 'PLEDIT', 'PLAYLIST_VISUALIZER_BACKGROUND') }}
        />
      )}
      {extra > 2 && !layout.open.main && <Visualizer x={W - 223} y={bottomY + 12} w={72} h={16} mode={layout.vis} />}
      <div
        className="wa-abs"
        style={{ left: W - 150, top: bottomY, ...sprite(skin, 'PLEDIT', 'PLAYLIST_BOTTOM_RIGHT_CORNER') }}
      />
      <ButtonMenus W={W} y={bottomY + 8} />
      <RunningTime x={W - 143} y={bottomY + 10} />
      <Btn x={W - 147} y={bottomY + 22} w={10} h={10} title="Previous" onClick={() => player.previous()} />
      <Btn x={W - 137} y={bottomY + 22} w={10} h={10} title="Play" onClick={() => player.play()} />
      <Btn x={W - 127} y={bottomY + 22} w={10} h={10} title="Pause" onClick={() => player.pause()} />
      <Btn x={W - 117} y={bottomY + 22} w={10} h={10} title="Stop" onClick={() => player.stop()} />
      <Btn x={W - 107} y={bottomY + 22} w={10} h={10} title="Next" onClick={() => player.next()} />
      <Btn x={W - 97} y={bottomY + 22} w={10} h={10} title="Open file(s)" onClick={() => ui.openFiles(true)} />
      <MiniTime x={W - 84} y={bottomY + 23} />
      {!ui.mobile && (
        <div
          className="wa-abs wa-c wa-grip"
          style={{ left: W - 20, top: H - 20, width: 20, height: 20 }}
          onPointerDown={(e) => ui.resizePlaylist(e)}
        />
      )}
    </div>
  )
}

function RunningTime({ x, y }: { x: number; y: number }) {
  const tracks = usePlayer((s) => s.tracks)
  const { selected } = useUi()
  const sum = (list: Track[]) => list.reduce((t, k) => t + (k.duration ?? 0), 0)
  const unknown = tracks.some((t) => t.duration === undefined) ? '+' : ''
  const text = `${hmmss(sum(tracks.filter((t) => selected.has(t.id))))}/${hmmss(sum(tracks))}${unknown}`
  return <Text text={text.padEnd(18, ' ')} x={x} y={y} />
}

function TrackList({ W, H }: { W: number; H: number }) {
  const ui = useUi()
  const skin = useSkin()
  const tracks = usePlayer((s) => s.tracks)
  const current = usePlayer((s) => s.current)
  const { selected, setSelected } = ui
  const rows = Math.floor((H - 61) / ROW)
  const maxOffset = Math.max(0, tracks.length - rows)
  const [offset, setOffsetRaw] = useState(0)
  const setOffset = (o: number) => setOffsetRaw(Math.max(0, Math.min(maxOffset, Math.round(o))))
  const anchor = useRef(-1)
  const lastTap = useRef({ t: 0, i: -1 })
  const top = Math.min(offset, maxOffset)

  // Keep the playing track in view when it changes.
  useEffect(() => {
    if (current < 0) return
    setOffsetRaw((o) => (current < o ? current : current >= o + rows ? current - rows + 1 : o))
  }, [current, rows])

  const onRowDown = (e: ReactPointerEvent, i: number) => {
    if (e.button !== 0) return
    const id = tracks[i].id
    const el = e.currentTarget.parentElement as HTMLElement
    const rowPx = (el.getBoundingClientRect().height / (H - 58)) * ROW
    const y0 = e.clientY
    if (e.pointerType === 'touch') {
      // Touch: drag scrolls, tap selects, double tap plays.
      const start = top
      let moved = false
      track(
        e,
        (ev) => {
          if (Math.abs(ev.clientY - y0) > rowPx / 2) moved = true
          if (moved) setOffset(start - (ev.clientY - y0) / rowPx)
        },
        () => {
          if (moved) return
          const now = performance.now()
          if (lastTap.current.i === i && now - lastTap.current.t < 400) player.play(i)
          lastTap.current = { t: now, i }
          setSelected(new Set([id]))
          anchor.current = i
        },
      )
      return
    }
    let next: Set<string>
    if (e.ctrlKey || e.metaKey) {
      next = new Set(selected)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      anchor.current = i
    } else if (e.shiftKey && anchor.current >= 0) {
      const [a, b] = [Math.min(anchor.current, i), Math.max(anchor.current, i)]
      next = new Set(tracks.slice(a, b + 1).map((t) => t.id))
    } else {
      next = selected.has(id) ? new Set(selected) : new Set([id])
      anchor.current = i
    }
    setSelected(next)
    const ids = tracks.map((t) => t.id)
    let delta = 0
    track(
      e,
      (ev) => {
        const d = Math.round((ev.clientY - y0) / rowPx)
        if (d === delta) return
        delta = d
        player.reorder(moved(ids, next, d))
      },
      () => {
        if (delta === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey && next.size > 1) setSelected(new Set([id]))
      },
    )
  }

  const handleTop = maxOffset ? Math.round((top / maxOffset) * (H - 58 - 18)) : 0
  const style = skin.pledit
  return (
    <>
      <div
        className="wa-abs wa-list wa-c"
        style={{
          left: 12,
          top: 20,
          width: W - 32,
          height: H - 58,
          color: style.normal,
          fontFamily: `${style.font}, Arial, sans-serif`,
        }}
        onWheel={(e) => setOffset(top + Math.sign(e.deltaY) * Math.max(1, Math.round(Math.abs(e.deltaY) / 40)))}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget && e.button === 0) setSelected(new Set())
        }}
      >
        {tracks.slice(top, top + rows + 1).map((t, k) => {
          const i = top + k
          return (
            <div
              key={t.id}
              className="wa-row"
              style={{
                top: 3 + k * ROW,
                color: i === current ? style.current : undefined,
                background: selected.has(t.id) ? style.selectedBg : undefined,
              }}
              onPointerDown={(e) => onRowDown(e, i)}
              onDoubleClick={() => player.play(i)}
            >
              <span className="wa-row-title">
                {i + 1}. {t.title}
              </span>
              <span className="wa-row-time">{t.duration !== undefined ? mmss(t.duration) : ''}</span>
            </div>
          )
        })}
      </div>
      <div
        className="wa-abs wa-c wa-slider"
        style={{ left: W - 15, top: 20, width: 8, height: H - 58 }}
        onPointerDown={(e) => {
          if (e.button !== 0 || !maxOffset) return
          const el = e.currentTarget
          const at = (ev: { clientX: number; clientY: number }) =>
            setOffset(slideValue(ev, el, 'y', H - 58, 18) * maxOffset)
          at(e)
          track(e, at)
        }}
      >
        <div
          className="wa-abs"
          style={{ left: 0, top: handleTop, ...sprite(skin, 'PLEDIT', 'PLAYLIST_SCROLL_HANDLE') }}
        />
      </div>
      <Btn x={W - 15} y={H - 36} w={8} h={5} title="Scroll up" onClick={() => setOffset(top - 4)} />
      <Btn x={W - 15} y={H - 30} w={8} h={5} title="Scroll down" onClick={() => setOffset(top + 4)} />
    </>
  )
}

type FlyItem = { name: P; title: string; run: (e: { clientX: number; clientY: number }) => void }

/** Winamp's pop-up button strips (ADD/REM/SEL/MISC/LIST): press opens, the bottom item sits on the button. */
function Flyout({ x, y, label, bar, items }: { x: number; y: number; label: string; bar: P; items: FlyItem[] }) {
  const skin = useSkin()
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(-1)
  const fresh = useRef(false)
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => !(e.target as Element).closest?.(`[data-fly="${bar}"]`) && setOpen(false)
    document.addEventListener('pointerdown', down, true)
    return () => document.removeEventListener('pointerdown', down, true)
  }, [open, bar])
  const n = items.length
  const barH = sprite(skin, 'PLEDIT', bar).height as number
  return (
    <div data-fly={bar}>
      {!open && (
        <button
          type="button"
          tabIndex={-1}
          className="wa-btn"
          style={{ left: x, top: y, width: 22, height: 18 }}
          title={label}
          onPointerDown={(e) => {
            if (e.button !== 0) return
            fresh.current = false
            setHover(n - 1)
            setOpen(true)
          }}
        />
      )}
      {open && (
        <>
          <div className="wa-abs" style={{ left: x - 3, top: y + 18 - barH, ...sprite(skin, 'PLEDIT', bar) }} />
          {items.map((it, k) => (
            <button
              type="button"
              tabIndex={-1}
              key={it.name}
              className="wa-btn"
              title={it.title}
              aria-label={it.title}
              style={{
                left: x,
                top: y - (n - 1 - k) * 18,
                ...sprite(skin, 'PLEDIT', hover === k ? (`${it.name}_SELECTED` as P) : it.name),
              }}
              onPointerEnter={() => {
                setHover(k)
                if (k !== n - 1) fresh.current = true
              }}
              onPointerDown={() => {
                fresh.current = true
              }}
              onPointerUp={(e) => {
                if (!fresh.current) return
                setOpen(false)
                it.run(e)
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}

function ButtonMenus({ W, y }: { W: number; y: number }) {
  const ui = useUi()
  const tracks = usePlayer((s) => s.tracks)
  const { selected, setSelected } = ui
  const ids = tracks.map((t) => t.id)
  const reorder = (order: Track[]) => player.reorder(order.map((t) => t.id))
  const sortMenu = (e: { clientX: number; clientY: number }) =>
    ui.openMenu(e.clientX, e.clientY, [
      {
        label: 'Sort list by title',
        onClick: () => reorder([...tracks].sort((a, b) => a.title.localeCompare(b.title))),
      },
      '-',
      { label: 'Reverse list', onClick: () => reorder([...tracks].reverse()) },
      {
        label: 'Randomize list',
        onClick: () => {
          const list = [...tracks]
          for (let i = list.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[list[i], list[j]] = [list[j], list[i]]
          }
          reorder(list)
        },
      },
    ])
  const firstSelected = () => {
    const i = tracks.findIndex((t) => selected.has(t.id))
    return i >= 0 ? i : undefined
  }
  return (
    <>
      <Flyout
        x={14}
        y={y}
        label="Add"
        bar="PLAYLIST_ADD_MENU_BAR"
        items={[
          { name: 'PLAYLIST_ADD_URL', title: 'Add URL', run: () => ui.openUrl(false) },
          { name: 'PLAYLIST_ADD_DIR', title: 'Add folder', run: () => ui.openDir() },
          { name: 'PLAYLIST_ADD_FILE', title: 'Add file(s)', run: () => ui.openFiles(false) },
        ]}
      />
      <Flyout
        x={43}
        y={y}
        label="Remove"
        bar="PLAYLIST_REMOVE_MENU_BAR"
        items={[
          {
            name: 'PLAYLIST_REMOVE_MISC',
            title: 'Remove misc',
            run: (e) =>
              ui.openMenu(e.clientX, e.clientY, [
                {
                  label: 'Remove duplicate entries',
                  onClick: () => {
                    const seen = new Set<string>()
                    player.remove(tracks.filter((t) => seen.has(t.title) || !seen.add(t.title)).map((t) => t.id))
                  },
                },
              ]),
          },
          { name: 'PLAYLIST_REMOVE_ALL', title: 'Remove all', run: () => player.remove(ids) },
          {
            name: 'PLAYLIST_CROP',
            title: 'Crop selection',
            run: () => player.remove(ids.filter((id) => !selected.has(id))),
          },
          { name: 'PLAYLIST_REMOVE_SELECTED', title: 'Remove selected', run: () => player.remove([...selected]) },
        ]}
      />
      <Flyout
        x={72}
        y={y}
        label="Selection"
        bar="PLAYLIST_SELECT_MENU_BAR"
        items={[
          {
            name: 'PLAYLIST_INVERT_SELECTION',
            title: 'Invert selection',
            run: () => setSelected(new Set(ids.filter((id) => !selected.has(id)))),
          },
          { name: 'PLAYLIST_SELECT_ZERO', title: 'Select none', run: () => setSelected(new Set()) },
          { name: 'PLAYLIST_SELECT_ALL', title: 'Select all', run: () => setSelected(new Set(ids)) },
        ]}
      />
      <Flyout
        x={101}
        y={y}
        label="Miscellaneous"
        bar="PLAYLIST_MISC_MENU_BAR"
        items={[
          { name: 'PLAYLIST_SORT_LIST', title: 'Sort list', run: sortMenu },
          { name: 'PLAYLIST_FILE_INFO', title: 'File info', run: () => ui.fileInfo(firstSelected()) },
          {
            name: 'PLAYLIST_MISC_OPTIONS',
            title: 'Misc options',
            run: (e) =>
              ui.openMenu(e.clientX, e.clientY, [
                { label: 'File info...', onClick: () => ui.fileInfo(firstSelected()) },
                { label: 'Sort list...', onClick: () => sortMenu(e) },
              ]),
          },
        ]}
      />
      <Flyout
        x={W - 44}
        y={y}
        label="Playlist"
        bar="PLAYLIST_LIST_BAR"
        items={[
          { name: 'PLAYLIST_NEW_LIST', title: 'New list', run: () => player.resetPlaylist() },
          { name: 'PLAYLIST_SAVE_LIST', title: 'Save list', run: ui.saveList },
          { name: 'PLAYLIST_LOAD_LIST', title: 'Load list', run: ui.openList },
        ]}
      />
    </>
  )
}

function PlaylistShade({ W, active }: { W: number; active: boolean }) {
  const ui = useUi()
  const skin = useSkin()
  const pos = ui.layout.pos.pl
  const title = usePlayer((s) => (s.current >= 0 ? `${s.current + 1}. ${s.tracks[s.current]?.title ?? ''}` : ''))
  const duration = usePlayer((s) => s.duration || s.tracks[s.current]?.duration || 0)
  const max = Math.floor((205 + (W - 275)) / 5)
  const name = title.length > max ? `${title.slice(0, max - 1)}…` : title
  const time = title ? mmss(duration) : ''
  return (
    <div
      className="wa-win"
      style={{ left: pos.x, top: pos.y, width: W, height: 14 }}
      onPointerDown={(e) => ui.grab('pl', e)}
      onDoubleClick={() => ui.toggleShade('pl')}
    >
      <Tiles name="PLAYLIST_SHADE_BACKGROUND" x={25} y={0} count={(W - 75) / 25} step={25} axis="x" />
      <div
        className="wa-abs"
        style={{ left: 0, top: 0, ...sprite(skin, 'PLEDIT', 'PLAYLIST_SHADE_BACKGROUND_LEFT') }}
      />
      <div
        className="wa-abs"
        style={{
          left: W - 50,
          top: 0,
          ...sprite(
            skin,
            'PLEDIT',
            active ? 'PLAYLIST_SHADE_BACKGROUND_RIGHT_SELECTED' : 'PLAYLIST_SHADE_BACKGROUND_RIGHT',
          ),
        }}
      />
      <Text text={name} x={5} y={4} />
      <Text text={time} x={W - 30 - time.length * 5} y={4} />
      {!ui.mobile && (
        <div
          className="wa-abs wa-c wa-grip"
          style={{ left: W - 29, top: 3, width: 9, height: 9 }}
          onPointerDown={(e) => ui.resizePlaylist(e, true)}
        />
      )}
      <Btn
        x={W - 21}
        y={3}
        w={9}
        h={9}
        down={sprite(skin, 'PLEDIT', 'PLAYLIST_EXPAND_SELECTED')}
        title="Normal mode"
        onClick={() => ui.toggleShade('pl')}
      />
      <Btn
        x={W - 11}
        y={3}
        w={9}
        h={9}
        down={sprite(skin, 'PLEDIT', 'PLAYLIST_CLOSE_SELECTED')}
        title="Close"
        onClick={() => ui.toggleWindow('pl')}
      />
    </div>
  )
}
