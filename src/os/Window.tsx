import { type ReactNode, type PointerEvent as ReactPointerEvent, createContext, useCallback, useRef, useState } from 'react'
import { GameWindowContext } from '../games/kit/window'
import { Icon } from './icons'

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
  /** Minimized but kept mounted (apps that keep working in the background, e.g. a playing Winamp). */
  hidden?: boolean
  onFocus: () => void
  onClose: () => void
  onMinimize: () => void
  onToggleMax: () => void
  onGeom: (g: WinGeom) => void
  onTitle?: (title: string | undefined) => void
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

/** Luna window: rounded blue title bar, XP caption buttons, beige client area, 3px frame. */
export function Window(p: Props) {
  const start = useRef(p.geom)
  const frame = useRef<HTMLElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const latest = useRef(p)
  latest.current = p
  const [titleOverride, setTitleOverride] = useState<string>()
  const title = titleOverride ?? p.title
  const setTitle = useCallback((title: string | undefined) => {
    setTitleOverride(title)
    latest.current.onTitle?.(title)
  }, [])
  const fit = useCallback(function fit(clientW: number, clientH: number) {
    const p = latest.current
    if (p.mobile || p.maximized || p.skinned) return
    if (!Number.isFinite(clientW) || !Number.isFinite(clientH) || clientW <= 0 || clientH <= 0) return
    if (!frame.current || !body.current) {
      requestAnimationFrame(() => {
        if (frame.current && body.current) fit(clientW, clientH)
      })
      return
    }
    const outer = frame.current.getBoundingClientRect()
    const inner = body.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight - TASKBAR_H
    const w = Math.min(vw, Math.ceil(clientW + outer.width - inner.width))
    const h = Math.min(vh, Math.ceil(clientH + outer.height - inner.height))
    const x = Math.max(0, Math.min(p.geom.x, vw - w))
    const y = Math.max(0, Math.min(p.geom.y, vh - h))
    if (w !== p.geom.w || h !== p.geom.h || x !== p.geom.x || y !== p.geom.y) p.onGeom({ x, y, w, h })
  }, [])
  const content = <GameWindowContext.Provider value={{ active: p.active, hidden: !!p.hidden, fit, setTitle }}>{p.children}</GameWindowContext.Provider>
  const free = !p.mobile && !p.maximized

  if (p.mobile)
    return (
      <section className={`window pocket-window${p.skinned ? ' skinned' : ''}`} aria-label={title} hidden={p.hidden}>
        <ChromeContext.Provider value={{ active: p.active, minimize: p.onMinimize, drag: () => {} }}>
          <div className="window-body">{content}</div>
        </ChromeContext.Provider>
      </section>
    )

  const onDrag = (e: ReactPointerEvent) => {
    if (!free || e.button !== 0 || (e.target as HTMLElement).closest('button')) return
    start.current = p.geom
    track(e, (dx, dy) => {
      const g = start.current
      const x = Math.min(Math.max(g.x + dx, 80 - g.w), window.innerWidth - 80)
      const y = Math.min(Math.max(g.y + dy, 0), window.innerHeight - TASKBAR_H - 30)
      p.onGeom({ ...g, x, y })
    })
  }

  const onResize = (e: ReactPointerEvent) => {
    e.stopPropagation()
    start.current = p.geom
    track(e, (dx, dy) => {
      const g = start.current
      p.onGeom({ ...g, w: Math.max(380, g.w + dx), h: Math.max(280, g.h + dy) })
    })
  }

  if (p.skinned)
    return (
      <section
        className={`window skinned${p.active ? ' active' : ''}`}
        style={{ left: p.geom.x, top: p.geom.y, zIndex: p.z }}
        onPointerDownCapture={p.onFocus}
        aria-label={title}
        hidden={p.hidden}
      >
        <ChromeContext.Provider value={{ active: p.active, minimize: p.onMinimize, drag: onDrag }}>{content}</ChromeContext.Provider>
      </section>
    )

  const style = free ? { left: p.geom.x, top: p.geom.y, width: p.geom.w, height: p.geom.h, zIndex: p.z } : { zIndex: p.z }

  return (
    <section
      ref={frame}
      className={`window${p.active ? ' active' : ''}${p.maximized ? ' maximized' : ''}${p.dialog ? ' dialog' : ''}`}
      style={style}
      onPointerDownCapture={p.onFocus}
      aria-label={title}
      hidden={p.hidden}
    >
      <header className="titlebar" onPointerDown={onDrag} onDoubleClick={() => !p.dialog && p.resizable !== false && p.onToggleMax()}>
        <Icon name={p.icon} size={16} className="title-icon" />
        <span className="title-text">{title}</span>
        <div className="title-controls">
          {!p.dialog && (
            <>
              <button type="button" className="cap min" aria-label="Minimize" title="Minimize" onClick={p.onMinimize} />
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
          <button type="button" className="cap close" aria-label="Close" title="Close" onClick={p.onClose} />
        </div>
      </header>
      <div className="window-body" ref={body}>
        {content}
      </div>
      {free && !p.dialog && p.resizable !== false && <div className="resize-grip" onPointerDown={onResize} />}
    </section>
  )
}
