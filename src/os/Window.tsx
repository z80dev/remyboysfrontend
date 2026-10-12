import { type ReactNode, type PointerEvent as ReactPointerEvent, createContext, useCallback, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GameWindowContext } from '../games/kit/window'
import { Icon } from './icons'
import { WindowHostContext } from './windowHost'

/** What a skinned app (no Luna frame) needs from its window: it draws its own title bar and caption buttons. */
export type Chrome = {
  active: boolean
  minimize: () => void
  /** Start moving the window from a pointerdown on the app's own title bar. No-op on the Pocket shell. */
  drag: (e: ReactPointerEvent) => void
}
export const ChromeContext = createContext<Chrome | undefined>(undefined)

export type WinGeom = { x: number; y: number; w: number; h: number }

type Props = {
  /** The current desktop or Pocket client area; the application owner never moves in the React tree. */
  host: HTMLElement | null
  title: string
  icon: string
  geom: WinGeom
  z: number
  active: boolean
  maximized: boolean
  mobile: boolean
  dialog?: boolean
  resizable?: boolean
  /** Draws no Luna frame; the app paints its own chrome through ChromeContext and sizes itself. */
  skinned?: boolean
  /** Open but not visible; its application stays mounted until the window is actually closed. */
  hidden?: boolean
  onFocus: () => void
  onClose: () => void
  onMinimize: () => void
  onToggleMax: () => void
  onGeom: (g: WinGeom) => void
  onTitle?: (title: string | undefined) => void
  onCloseGuard?: (guard: (() => void) | undefined) => void
  children: ReactNode
}

export const TASKBAR_H = 30

function track(e: ReactPointerEvent, move: (dx: number, dy: number) => void) {
  const sx = e.clientX
  const sy = e.clientY
  const target = e.currentTarget as HTMLElement
  target.setPointerCapture(e.pointerId)
  const onMove = (ev: PointerEvent) => move(ev.clientX - sx, ev.clientY - sy)
  const onUp = () => {
    target.removeEventListener('pointermove', onMove)
    target.removeEventListener('pointerup', onUp)
    target.removeEventListener('pointercancel', onUp)
  }
  target.addEventListener('pointermove', onMove)
  target.addEventListener('pointerup', onUp)
  target.addEventListener('pointercancel', onUp)
}

/** Where focus goes when a window regains it: the app's declared surface first, then anything keyboard-reachable. */
const FOCUS_ORDER = [
  '[data-initial-focus]',
  '[role="application"][tabindex="0"]',
  '[tabindex="0"], button:not([disabled]), input:not([disabled]), textarea, select, a[href]',
]

/** The element that last had focus inside each window, so returning focus lands where the visitor left it. */
const lastFocus = new WeakMap<Element, HTMLElement>()

/** `onFocusCapture` for a window's root: remembers the focused client element. */
const rememberFocus = (e: { currentTarget: Element; target: EventTarget }) => lastFocus.set(e.currentTarget, e.target as HTMLElement)

/**
 * Win32 keeps keyboard focus inside the active window. When focus has fallen out of every window (onto <body>, e.g. after
 * a caption click or the log-on screen closing), hand it back: the element last focused there, else the app's surface.
 */
export function focusActiveWindow(win: Element | null = document.querySelector('.window.active')) {
  if (!win || win.contains(document.activeElement)) return
  ;(document.activeElement as HTMLElement | null)?.blur()
  const last = lastFocus.get(win)
  if (last?.isConnected && win.contains(last) && !last.closest('[role="menubar"], [role="menu"]')) return last.focus({ preventScroll: true })
  const client = win.querySelector('.window-body') ?? win
  for (const sel of FOCUS_ORDER) {
    const el = client.querySelector<HTMLElement>(sel)
    if (el) return el.focus({ preventScroll: true })
  }
}

/** Stable application owner with a replaceable Luna, Pocket or skinned physical frame. */
export function Window(p: Props) {
  const start = useRef(p.geom)
  const frame = useRef<HTMLElement | null>(null)
  const [body] = useState(() => {
    const client = document.createElement('div')
    client.className = 'window-body'
    return client
  })
  const [root, setRoot] = useState<HTMLElement | null>(null)
  const latest = useRef(p)
  latest.current = p
  const [titleOverride, setTitleOverride] = useState<string>()
  const title = titleOverride ?? p.title
  const setTitle = useCallback((title: string | undefined) => {
    setTitleOverride(title)
    latest.current.onTitle?.(title)
  }, [])
  const closeGuard = useRef<(() => void) | undefined>()
  const minSize = useRef<{ w: number; h: number }>()
  const requestedFit = useRef<{ w: number; h: number }>()
  const setCloseGuard = useCallback((guard: (() => void) | undefined) => {
    closeGuard.current = guard
    latest.current.onCloseGuard?.(guard)
  }, [])
  const requestClose = useCallback(() => (closeGuard.current ? closeGuard.current() : latest.current.onClose()), [])
  const minimize = useCallback(() => latest.current.onMinimize(), [])
  const applyFit = useCallback(
    function applyFit(clientW: number, clientH: number) {
      const p = latest.current
      if (p.mobile || p.maximized || p.skinned || p.hidden) return
      if (!frame.current?.isConnected || !body.isConnected) {
        requestAnimationFrame(() => {
          if (frame.current?.isConnected && body.isConnected) applyFit(clientW, clientH)
        })
        return
      }
      const outer = frame.current.getBoundingClientRect()
      const inner = body.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight - TASKBAR_H
      const w = Math.min(vw, Math.ceil(Math.max(clientW, minSize.current?.w ?? 0) + outer.width - inner.width))
      const h = Math.min(vh, Math.ceil(Math.max(clientH, minSize.current?.h ?? 0) + outer.height - inner.height))
      const x = Math.max(0, Math.min(p.geom.x, vw - w))
      const y = Math.max(0, Math.min(p.geom.y, vh - h))
      if (w !== p.geom.w || h !== p.geom.h || x !== p.geom.x || y !== p.geom.y) p.onGeom({ x, y, w, h })
    },
    [body],
  )
  const fit = useCallback(
    (clientW: number, clientH: number) => {
      if (!Number.isFinite(clientW) || !Number.isFinite(clientH) || clientW <= 0 || clientH <= 0) return
      requestedFit.current = { w: clientW, h: clientH }
      applyFit(clientW, clientH)
    },
    [applyFit],
  )
  const setMinSize = useCallback(
    (size: { w: number; h: number } | undefined) => {
      if (size && (!Number.isFinite(size.w) || !Number.isFinite(size.h) || size.w <= 0 || size.h <= 0)) return
      minSize.current = size
      const inner = body.isConnected ? body.getBoundingClientRect() : undefined
      if (size && inner) applyFit(Math.max(size.w, inner.width), Math.max(size.h, inner.height))
    },
    [applyFit, body],
  )

  const onDrag = useCallback((e: ReactPointerEvent) => {
    const p = latest.current
    if (p.mobile || p.maximized || e.button !== 0 || (e.target as HTMLElement).closest('button')) return
    start.current = p.geom
    track(e, (dx, dy) => {
      const g = start.current
      const x = Math.min(Math.max(g.x + dx, 80 - g.w), window.innerWidth - 80)
      const y = Math.min(Math.max(g.y + dy, 0), window.innerHeight - TASKBAR_H - 30)
      latest.current.onGeom({ ...g, x, y })
    })
  }, [])

  const onResize = useCallback(
    (e: ReactPointerEvent) => {
      const p = latest.current
      e.stopPropagation()
      start.current = p.geom
      track(e, (dx, dy) => {
        const g = start.current
        const minimum = minSize.current
        if (!minimum) {
          latest.current.onGeom({ ...g, w: Math.max(380, g.w + dx), h: Math.max(280, g.h + dy) })
          return
        }
        const outer = frame.current?.getBoundingClientRect()
        const inner = body.getBoundingClientRect()
        const minW = minimum.w + (outer && inner ? outer.width - inner.width : 6)
        const minH = minimum.h + (outer && inner ? outer.height - inner.height : 33)
        const w = Math.min(window.innerWidth, Math.max(minW, g.w + dx))
        const h = Math.min(window.innerHeight - TASKBAR_H, Math.max(minH, g.h + dy))
        latest.current.onGeom({ ...g, w, h })
      })
    },
    [body],
  )

  // Application and modal portals are not logical descendants of the frame; capture on its physical root.
  const focusWindow = useCallback(() => latest.current.onFocus(), [])
  const rememberWindow = useCallback(
    (e: FocusEvent) => {
      if (!frame.current || !e.target) return
      rememberFocus({ currentTarget: frame.current, target: e.target })
      lastFocus.set(body, e.target as HTMLElement)
    },
    [body],
  )
  const attachFrame = useCallback(
    (node: HTMLElement | null) => {
      const previous = frame.current
      if (previous === node) return
      previous?.removeEventListener('pointerdown', focusWindow, true)
      previous?.removeEventListener('focus', rememberWindow, true)
      body.remove()
      frame.current = node
      if (node) {
        // Skinned desktop apps keep their original zero-sized origin; this client adds no layout box.
        body.style.display = latest.current.skinned && !latest.current.mobile ? 'contents' : ''
        node.insertBefore(body, node.querySelector('.resize-grip'))
        node.addEventListener('pointerdown', focusWindow, true)
        node.addEventListener('focus', rememberWindow, true)
        const remembered = lastFocus.get(body)
        if (remembered) {
          lastFocus.set(node, remembered)
          requestAnimationFrame(() => {
            const p = latest.current
            if (frame.current === node && node.isConnected && p.active && !p.hidden && document.activeElement === document.body) focusActiveWindow(node)
          })
        }
      }
      setRoot(node)
    },
    [body, focusWindow, rememberWindow],
  )
  const clampToViewport = useCallback(() => {
    const p = latest.current
    if (p.mobile || p.maximized || p.skinned || p.hidden) return
    const vw = window.innerWidth
    const vh = Math.max(1, window.innerHeight - TASKBAR_H)
    const w = Math.min(p.geom.w, vw)
    const h = Math.min(p.geom.h, vh)
    const x = Math.max(0, Math.min(p.geom.x, vw - w))
    const y = Math.max(0, Math.min(p.geom.y, vh - h))
    if (w !== p.geom.w || h !== p.geom.h || x !== p.geom.x || y !== p.geom.y) p.onGeom({ x, y, w, h })
  }, [])
  useLayoutEffect(() => {
    window.addEventListener('resize', clampToViewport)
    window.visualViewport?.addEventListener('resize', clampToViewport)
    return () => {
      window.removeEventListener('resize', clampToViewport)
      window.visualViewport?.removeEventListener('resize', clampToViewport)
    }
  }, [clampToViewport])
  useLayoutEffect(() => {
    if (!root || p.hidden || p.mobile || p.maximized || p.skinned) return
    const requested = requestedFit.current
    const minimum = minSize.current
    if (requested) applyFit(requested.w, requested.h)
    else if (minimum) {
      const inner = body.getBoundingClientRect()
      applyFit(Math.max(minimum.w, inner.width), Math.max(minimum.h, inner.height))
    } else clampToViewport()
  }, [root, p.mobile, p.maximized, p.skinned, p.hidden, body, applyFit, clampToViewport])
  const free = !p.mobile && !p.maximized

  const style = free ? { left: p.geom.x, top: p.geom.y, width: p.geom.w, height: p.geom.h, zIndex: p.z } : { zIndex: p.z }

  const shellFrame = p.mobile ? (
    <section
      ref={attachFrame}
      className={`window pocket-window${p.active ? ' active' : ''}${p.skinned ? ' skinned' : ''}`}
      onFocusCapture={rememberFocus}
      aria-label={title}
      hidden={p.hidden}
    />
  ) : p.skinned ? (
    <section
      ref={attachFrame}
      className={`window skinned${p.active ? ' active' : ''}`}
      style={{ left: p.geom.x, top: p.geom.y, zIndex: p.z }}
      onFocusCapture={rememberFocus}
      aria-label={title}
      hidden={p.hidden}
    />
  ) : (
    <section
      ref={attachFrame}
      className={`window${p.active ? ' active' : ''}${p.maximized ? ' maximized' : ''}${p.dialog ? ' dialog' : ''}`}
      style={style}
      onFocusCapture={rememberFocus}
      aria-label={title}
      hidden={p.hidden}
    >
      {/* Caption clicks never move focus to <body> (Win32 keeps it in the client area); focus left in another window is dropped. */}
      <header
        className="titlebar"
        onPointerDown={onDrag}
        onMouseDown={(e) => {
          e.preventDefault()
          focusActiveWindow(frame.current)
        }}
        onDoubleClick={() => !p.dialog && p.resizable !== false && p.onToggleMax()}
      >
        <Icon name={p.icon} size={16} className="title-icon" />
        <span className="title-text">{title}</span>
        <div className="title-controls">
          {!p.dialog && (
            <>
              <button type="button" className="cap min" aria-label="Minimize" title="Minimize" onClick={minimize} />
              <button
                type="button"
                className={`cap ${p.maximized ? 'restore' : 'max'}`}
                aria-label={p.maximized ? 'Restore' : 'Maximize'}
                title={p.maximized ? 'Restore Down' : 'Maximize'}
                onClick={p.onToggleMax}
                disabled={p.resizable === false}
              />
            </>
          )}
          <button type="button" className="cap close" aria-label="Close" title="Close" onClick={requestClose} />
        </div>
      </header>
      {free && !p.dialog && p.resizable !== false && <div className="resize-grip" onPointerDown={onResize} />}
    </section>
  )
  return (
    <>
      {p.host && createPortal(shellFrame, p.host, p.mobile ? 'pocket' : p.skinned ? 'skinned' : 'luna')}
      <WindowHostContext.Provider value={root}>
        <GameWindowContext.Provider value={{ active: p.active, hidden: !!p.hidden, pocket: p.mobile, fit, setTitle, setCloseGuard, setMinSize }}>
          <ChromeContext.Provider value={{ active: p.active, minimize, drag: onDrag }}>{createPortal(p.children, body)}</ChromeContext.Provider>
        </GameWindowContext.Provider>
      </WindowHostContext.Provider>
    </>
  )
}
