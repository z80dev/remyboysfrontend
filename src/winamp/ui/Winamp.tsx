import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { ChromeContext, TASKBAR_H } from '../../os/Window'
import { messageBox, useIsMobile, useShell } from '../../os/shell'
import { player } from '../player/player'
import { baseSkin } from '../skin/base'
import type { Skin } from '../skin/types'
import { loadWsz } from '../skin/wsz'
import { EqWindow } from './EqWindow'
import { MainWindow } from './MainWindow'
import { Menu, type MenuAt, type MenuItem } from './Menu'
import { PlaylistWindow } from './Playlist'
import {
  type Layout,
  WIN_IDS,
  type WinId,
  dockedGroup,
  fitInto,
  loadLayout,
  moveGroup,
  resize,
  saveLayout,
  stacked,
  winSize,
} from './layout'
import { SkinContext } from './skin'
import { type Ui, UiContext } from './ui'
import { mmss, track } from './util'
import './winamp.css'

const AUDIO_ACCEPT = 'audio/*,.mp3,.ogg,.oga,.opus,.wav,.flac,.m4a,.aac,.webm,.mid'
const isSkinFile = (f: File) => /\.(wsz|zip)$/i.test(f.name)

/** Files from a drop, descending into dropped folders. */
async function droppedFiles(dt: DataTransfer): Promise<File[]> {
  const entries = Array.from(dt.items, (i) => i.webkitGetAsEntry?.()).filter((e): e is FileSystemEntry => !!e)
  if (!entries.some((e) => e.isDirectory)) return Array.from(dt.files)
  const out: File[] = []
  const walk = async (entry: FileSystemEntry): Promise<void> => {
    if (entry.isFile) {
      out.push(await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej)))
      return
    }
    const reader = (entry as FileSystemDirectoryEntry).createReader()
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej))
      if (!batch.length) break
      for (const e of batch) await walk(e)
    }
  }
  for (const e of entries) await walk(e)
  return out.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
}

/** URLs from an .m3u/.pls playlist (local paths can't be opened from a browser and are skipped). */
function playlistUrls(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^File\d+=/i, ''))
    .filter((l) => /^https?:\/\//i.test(l))
}

/** Classic Winamp 2.x: main window, equalizer and playlist editor painted from skin sprites. */
export function WinampApp({ close }: { close: () => void }) {
  const chrome = useContext(ChromeContext)
  const mobile = useIsMobile()
  const theme = useShell((s) => s.prefs.theme)
  const [skin, setSkin] = useState<Skin>(baseSkin)
  const [custom, setCustom] = useState<Skin>()
  const [saved, setSaved] = useState<Layout>(loadLayout)
  const [focused, setFocused] = useState<WinId>('main')
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())
  const [menu, setMenu] = useState<MenuAt>()
  const [urlPrompt, setUrlPrompt] = useState<{ play: boolean }>()
  const [phoneWidth, setPhoneWidth] = useState(275)
  const rootRef = useRef<HTMLDivElement>(null)
  const phoneRef = useRef<HTMLDivElement>(null)
  const audioInput = useRef<HTMLInputElement>(null)
  const dirInput = useRef<HTMLInputElement>(null)
  const skinInput = useRef<HTMLInputElement>(null)
  const listInput = useRef<HTMLInputElement>(null)
  const playPicked = useRef(false)

  const layout = useMemo(() => (mobile ? stacked(saved) : saved), [mobile, saved])
  const dpr = window.devicePixelRatio || 1
  // Phone: fit the width, snapped so one skin pixel is a whole number of device pixels unless that wastes
  // too much of the screen (then the pixels are near-integer, still nearest-neighbour).
  const fit = phoneWidth / 275
  const crisp = Math.floor(fit * dpr) / dpr
  const phoneScale = crisp >= fit * 0.85 ? crisp : fit
  const scale = mobile ? phoneScale : layout.double ? 2 : 1
  const latest = useRef({ layout, scale })
  latest.current = { layout, scale }

  useEffect(() => {
    const t = window.setTimeout(() => saveLayout(saved), 300)
    return () => window.clearTimeout(t)
  }, [saved])
  useEffect(() => () => player.shutdown(), [])

  useLayoutEffect(() => {
    const host = phoneRef.current?.parentElement
    if (!mobile || !host) return
    const ro = new ResizeObserver(() => setPhoneWidth(host.clientWidth))
    ro.observe(host)
    return () => ro.disconnect()
  }, [mobile])

  /** The visible desktop above the taskbar, in app (skin px) coordinates. */
  const bounds = useCallback(() => {
    const r = rootRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 }
    const s = latest.current.scale
    return { x: -r.left / s, y: -r.top / s, w: window.innerWidth / s, h: (window.innerHeight - TASKBAR_H) / s }
  }, [])

  const setLayout = useCallback((change: (l: Layout) => Layout) => setSaved((l) => change(l)), [])

  const exit = useCallback(() => {
    player.shutdown()
    close()
  }, [close])

  const openFiles = useCallback((play: boolean) => {
    playPicked.current = play
    audioInput.current?.click()
  }, [])

  const loadSkin = useCallback(async (file: File) => {
    try {
      const next = await loadWsz(file, file.name.replace(/\.(wsz|zip)$/i, ''), baseSkin())
      setCustom(next)
      setSkin(next)
    } catch (err) {
      messageBox({
        title: 'Winamp',
        icon: 'error',
        text: `Couldn't load ${file.name}: ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  }, [])

  const addFiles = useCallback((files: File[], play: boolean) => {
    if (!files.length) return
    if (!player.addFiles(files, play))
      messageBox({ title: 'Winamp', icon: 'warning', text: 'None of those files is an audio file Winamp can play.' })
  }, [])

  const fileInfo = useCallback((index?: number) => {
    const s = player.getState()
    const i = index ?? (s.current >= 0 ? s.current : 0)
    const t = s.tracks[i]
    if (!t) return
    const src = t.source
    const from =
      src.kind === 'synth'
        ? 'Remy Boys original, synthesized live in your browser'
        : src.kind === 'file'
          ? `File: ${src.file.name}`
          : `URL: ${src.url}`
    const duration = i === s.current && s.duration > 0 ? s.duration : t.duration
    const info =
      i === s.current && s.info
        ? ` · ${s.info.kbps} kbps, ${s.info.khz} kHz, ${s.info.channels > 1 ? 'stereo' : 'mono'}`
        : ''
    messageBox({
      title: 'File info',
      icon: 'info',
      text: `${i + 1}. ${t.title}${duration ? ` (${mmss(duration)})` : ''} · ${from}${info}`,
    })
  }, [])

  const about = useCallback(
    () =>
      messageBox({
        title: 'About Winamp',
        icon: 'info',
        text: 'Winamp 2.91, Remy OS edition. Plays the Remy Boys soundtrack and anything you drop on it; loads classic .wsz skins. It really whips the llama’s ass.',
      }),
    [],
  )

  const saveList = useCallback(() => {
    const lines = ['#EXTM3U']
    for (const t of player.getState().tracks) {
      lines.push(`#EXTINF:${Math.round(t.duration ?? -1)},${t.title}`)
      // Only streams can be reopened from a browser; files and built-in songs are listed as comments.
      lines.push(
        t.source.kind === 'url' ? t.source.url : `# ${t.source.kind === 'file' ? t.source.file.name : t.title}`,
      )
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([`${lines.join('\n')}\n`], { type: 'audio/x-mpegurl' }))
    a.download = 'playlist.m3u'
    a.click()
    URL.revokeObjectURL(a.href)
  }, [])

  const toggleWindow = useCallback(
    (id: WinId) =>
      setSaved((l) => {
        // Winamp never hides its last window from here.
        if (l.open[id] && WIN_IDS.filter((w) => l.open[w]).length === 1) return l
        return { ...l, open: { ...l.open, [id]: !l.open[id] } }
      }),
    [],
  )

  const toggleShade = useCallback(
    (id: WinId) => setSaved((l) => resize(l, id, (n) => ({ ...n, shade: { ...n.shade, [id]: !n.shade[id] } }))),
    [],
  )

  const toggleDouble = useCallback(() => {
    if (mobile) return
    setSaved((l) => ({ ...l, double: !l.double }))
    // Grown windows may stick out of the screen: pull them back once the new scale applies.
    requestAnimationFrame(() => setSaved((l) => fitInto(l, bounds())))
  }, [mobile, bounds])

  const pb = useCallback((): MenuItem[] => {
    const s = player.getState()
    return [
      { label: 'Previous', hotkey: 'Z', onClick: () => player.previous() },
      { label: 'Play', hotkey: 'X', onClick: () => player.play() },
      { label: 'Pause', hotkey: 'C', onClick: () => player.pause() },
      { label: 'Stop', hotkey: 'V', onClick: () => player.stop() },
      { label: 'Next', hotkey: 'B', onClick: () => player.next() },
      '-',
      { label: 'Back 5 seconds', hotkey: 'Left', onClick: () => player.seek(player.time() - 5) },
      { label: 'Fwd 5 seconds', hotkey: 'Right', onClick: () => player.seek(player.time() + 5) },
      '-',
      { label: 'Repeat', hotkey: 'R', checked: s.repeat, onClick: () => player.toggleRepeat() },
      { label: 'Shuffle', hotkey: 'S', checked: s.shuffle, onClick: () => player.toggleShuffle() },
    ]
  }, [])

  const optionsMenu = useCallback((): MenuItem[] => {
    const l = latest.current.layout
    return [
      {
        label: 'Time elapsed',
        hotkey: 'Ctrl+T',
        radio: true,
        checked: !l.remaining,
        onClick: () => setSaved((n) => ({ ...n, remaining: false })),
      },
      {
        label: 'Time remaining',
        hotkey: 'Ctrl+T',
        radio: true,
        checked: l.remaining,
        onClick: () => setSaved((n) => ({ ...n, remaining: true })),
      },
      '-',
      {
        label: 'Always on top',
        hotkey: 'Ctrl+A',
        checked: l.alwaysOnTop,
        onClick: () => setSaved((n) => ({ ...n, alwaysOnTop: !n.alwaysOnTop })),
      },
      { label: 'Double size', hotkey: 'Ctrl+D', checked: l.double, disabled: mobile, onClick: toggleDouble },
    ]
  }, [mobile, toggleDouble])

  const visMenu = useCallback((): MenuItem[] => {
    const v = latest.current.layout.vis
    const set = (vis: Layout['vis']) => () => setSaved((n) => ({ ...n, vis }))
    return [
      { label: 'Spectrum analyzer', radio: true, checked: v === 'bars', onClick: set('bars') },
      { label: 'Oscilloscope', radio: true, checked: v === 'osc', onClick: set('osc') },
      { label: 'Disabled', radio: true, checked: v === 'off', onClick: set('off') },
    ]
  }, [])

  const mainMenu = useCallback((): MenuItem[] => {
    const l = latest.current.layout
    return [
      { label: 'About Winamp...', hotkey: 'Alt+3', bold: true, onClick: about },
      '-',
      { label: 'Play file...', hotkey: 'L', onClick: () => openFiles(true) },
      { label: 'Play URL...', hotkey: 'Ctrl+L', onClick: () => setUrlPrompt({ play: true }) },
      '-',
      { label: 'Main Window', hotkey: 'Alt+W', checked: l.open.main, onClick: () => toggleWindow('main') },
      { label: 'Playlist Editor', hotkey: 'Alt+E', checked: l.open.pl, onClick: () => toggleWindow('pl') },
      { label: 'Equalizer', hotkey: 'Alt+G', checked: l.open.eq, onClick: () => toggleWindow('eq') },
      '-',
      {
        label: 'Skins',
        items: [
          { label: 'Load skin...', onClick: () => skinInput.current?.click() },
          '-',
          { label: 'Base Skin', radio: true, checked: skin !== custom, onClick: () => setSkin(baseSkin()) },
          ...(custom
            ? [{ label: custom.name, radio: true, checked: skin === custom, onClick: () => setSkin(custom) }]
            : []),
        ],
      },
      '-',
      { label: 'Options', items: optionsMenu() },
      { label: 'Playback', items: pb() },
      '-',
      { label: 'Exit', onClick: exit },
    ]
  }, [about, openFiles, toggleWindow, skin, custom, optionsMenu, pb, exit])

  const grab = useCallback(
    (id: WinId, e: ReactPointerEvent) => {
      setFocused(id)
      if (mobile || e.button !== 0 || (e.target as Element).closest('button, .wa-c')) return
      e.preventDefault()
      const start = latest.current.layout
      const group = id === 'main' ? dockedGroup(start, 'main') : [id]
      const x0 = e.clientX
      const y0 = e.clientY
      const box = bounds()
      // Window listeners (no pointer capture) so the title bar still gets its dblclick.
      const move = (ev: PointerEvent) => {
        const s = latest.current.scale
        setSaved(moveGroup(start, group, (ev.clientX - x0) / s, (ev.clientY - y0) / s, box))
      }
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        window.removeEventListener('pointercancel', up)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      window.addEventListener('pointercancel', up)
    },
    [mobile, bounds],
  )

  const resizePlaylist = useCallback((e: ReactPointerEvent, widthOnly = false) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const start = latest.current.layout
    const [w0, h0] = start.plSize
    const x0 = e.clientX
    const y0 = e.clientY
    track(e, (ev) => {
      const s = latest.current.scale
      const w = Math.max(0, w0 + Math.round((ev.clientX - x0) / s / 25))
      const h = widthOnly ? h0 : Math.max(0, h0 + Math.round((ev.clientY - y0) / s / 29))
      setSaved((l) => (l.plSize[0] === w && l.plSize[1] === h ? l : resize(l, 'pl', (n) => ({ ...n, plSize: [w, h] }))))
    })
  }, [])

  const ui: Ui = {
    layout,
    setLayout,
    mobile,
    isActive: (id) => (chrome?.active ?? true) && focused === id,
    grab,
    toggleShade,
    toggleWindow,
    resizePlaylist,
    toggleDouble,
    minimize: () => chrome?.minimize(),
    exit,
    openMenu: (x, y, items) => setMenu({ x, y, items }),
    mainMenu,
    optionsMenu,
    visMenu,
    openFiles,
    openDir: () => dirInput.current?.click(),
    openUrl: (play) => setUrlPrompt({ play }),
    openList: () => listInput.current?.click(),
    saveList,
    fileInfo,
    about,
    selected,
    setSelected,
  }

  // Keyboard shortcuts while Winamp is the active OS window and no text field has focus.
  const keys = useRef<(e: KeyboardEvent) => void>()
  keys.current = (e: KeyboardEvent) => {
    if (chrome && !chrome.active) return
    const t = e.target as HTMLElement
    if (t.closest?.('input, textarea, select, [contenteditable="true"]') || urlPrompt) return
    const k = e.key.toLowerCase()
    const ctrl = e.ctrlKey || e.metaKey
    let handled = true
    if (ctrl && k === 'd' && !mobile) toggleDouble()
    else if (ctrl && k === 't') setSaved((l) => ({ ...l, remaining: !l.remaining }))
    else if (ctrl && k === 'l') setUrlPrompt({ play: true })
    else if (ctrl || e.altKey) handled = false
    else if (k === 'z') player.previous()
    else if (k === 'x') player.play()
    else if (k === 'c') player.pause()
    else if (k === 'v') player.stop()
    else if (k === 'b') player.next()
    else if (k === 'l') openFiles(true)
    else if (k === 'r') player.toggleRepeat()
    else if (k === 's') player.toggleShuffle()
    else if (k === 'arrowleft') player.seek(player.time() - 5)
    else if (k === 'arrowright') player.seek(player.time() + 5)
    else if (k === 'arrowup') player.setVolume(Math.min(100, player.getState().volume + 2))
    else if (k === 'arrowdown') player.setVolume(Math.max(0, player.getState().volume - 2))
    else if ((k === 'delete' || k === 'backspace') && selected.size) {
      player.remove([...selected])
      setSelected(new Set())
    } else handled = false
    if (handled) e.preventDefault()
  }
  useEffect(() => {
    const on = (e: KeyboardEvent) => keys.current?.(e)
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  const windows: Record<WinId, JSX.Element> = { main: <MainWindow />, eq: <EqWindow />, pl: <PlaylistWindow /> }
  const totalH = Math.max(...WIN_IDS.filter((w) => layout.open[w]).map((w) => layout.pos[w].y + winSize(layout, w)[1]))
  const root = (
    <div
      ref={rootRef}
      className={`wa-root${mobile ? ' wa-mobile' : ''}`}
      style={{ transform: scale !== 1 ? `scale(${scale})` : undefined }}
      onContextMenu={(e) => {
        e.preventDefault()
        setMenu({ x: e.clientX, y: e.clientY, items: mainMenu() })
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      }}
      onDrop={async (e) => {
        if (!e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        const files = await droppedFiles(e.dataTransfer)
        const skinFile = files.find(isSkinFile)
        if (skinFile) loadSkin(skinFile)
        addFiles(
          files.filter((f) => !isSkinFile(f)),
          true,
        )
      }}
    >
      {WIN_IDS.map(
        (id) =>
          layout.open[id] && (
            <div key={id} className="wa-layer" style={{ zIndex: id === focused ? 2 : 1 }}>
              {windows[id]}
            </div>
          ),
      )}
    </div>
  )

  return (
    <SkinContext.Provider value={skin}>
      <UiContext.Provider value={ui}>
        {mobile ? (
          <div ref={phoneRef} className="wa-phone" style={{ width: 275 * scale, height: totalH * scale }}>
            {root}
          </div>
        ) : (
          root
        )}
        <input
          ref={audioInput}
          type="file"
          accept={AUDIO_ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            addFiles(Array.from(e.currentTarget.files ?? []), playPicked.current)
            e.currentTarget.value = ''
          }}
        />
        <input
          ref={dirInput}
          type="file"
          multiple
          hidden
          {...{ webkitdirectory: '' }}
          onChange={(e) => {
            const files = Array.from(e.currentTarget.files ?? []).sort((a, b) =>
              a.webkitRelativePath.localeCompare(b.webkitRelativePath, undefined, { numeric: true }),
            )
            addFiles(files, false)
            e.currentTarget.value = ''
          }}
        />
        <input
          ref={skinInput}
          type="file"
          accept=".wsz,.zip"
          hidden
          onChange={(e) => {
            const f = e.currentTarget.files?.[0]
            if (f) loadSkin(f)
            e.currentTarget.value = ''
          }}
        />
        <input
          ref={listInput}
          type="file"
          accept=".m3u,.m3u8,.pls"
          hidden
          onChange={async (e) => {
            const f = e.currentTarget.files?.[0]
            e.currentTarget.value = ''
            if (!f) return
            const urls = playlistUrls(await f.text())
            for (const u of urls) player.addUrl(u)
            if (!urls.length)
              messageBox({
                title: 'Winamp',
                icon: 'warning',
                text: `${f.name} lists no web addresses; a browser can't open local paths from a playlist file.`,
              })
          }}
        />
        {menu && <Menu menu={menu} onClose={() => setMenu(undefined)} />}
        {urlPrompt &&
          createPortal(
            <UrlDialog
              theme={theme}
              onCancel={() => setUrlPrompt(undefined)}
              onOpen={(url) => {
                player.addUrl(url, urlPrompt.play)
                setUrlPrompt(undefined)
              }}
            />,
            document.body,
          )}
      </UiContext.Provider>
    </SkinContext.Provider>
  )
}

function UrlDialog({
  theme,
  onOpen,
  onCancel,
}: { theme: string; onOpen: (url: string) => void; onCancel: () => void }) {
  const [url, setUrl] = useState('http://')
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onCancel])
  return (
    <div className={`modal-layer theme-${theme}`}>
      {/* biome-ignore lint/a11y/useSemanticElements: same Luna dialog markup as the OS message boxes */}
      <section className="window active dialog wa-url" role="dialog" aria-modal="true" aria-labelledby="wa-url-title">
        <header className="titlebar">
          <span className="title-text" id="wa-url-title">
            Open URL
          </span>
          <div className="title-controls">
            <button type="button" className="cap close" aria-label="Close" onClick={onCancel} />
          </div>
        </header>
        <form
          className="window-body"
          onSubmit={(e) => {
            e.preventDefault()
            if (/^https?:\/\/.+/i.test(url.trim())) onOpen(url.trim())
          }}
        >
          <label htmlFor="wa-url-input">Enter location (URL) to open:</label>
          {/* biome-ignore lint/a11y/noAutofocus: a one-field dialog */}
          <input id="wa-url-input" type="url" value={url} autoFocus onChange={(e) => setUrl(e.target.value)} />
          <div className="dialog-buttons">
            <button type="submit" className="btn default">
              Open
            </button>
            <button type="button" className="btn" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
