import { type PointerEvent as ReactPointerEvent, type ReactNode, createContext, useRef } from 'react'
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
  /** Draws no Luna frame; the app paints its own chrome through ChromeContext and sizes itself. */
  skinned?: boolean
  /** Minimized but kept mounted (apps that keep working in the background, e.g. a playing Winamp). */
  hidden?: boolean
  onFocus: () => void
  onClose: () => void
  onMinimize: () => void
  onToggleMax: () => void
  onGeom: (g: WinGeom) => void
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
  const free = !p.mobile && !p.maximized

  if (p.mobile)
    return (
      <section className={`window pocket-window${p.skinned ? ' skinned' : ''}`} aria-label={p.title} hidden={p.hidden}>
        <ChromeContext.Provider value={{ active: p.active, minimize: p.onMinimize, drag: () => {} }}>
          <div className="window-body">{p.children}</div>
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
        aria-label={p.title}
        hidden={p.hidden}
      >
        <ChromeContext.Provider value={{ active: p.active, minimize: p.onMinimize, drag: onDrag }}>{p.children}</ChromeContext.Provider>
      </section>
    )

  const style = free ? { left: p.geom.x, top: p.geom.y, width: p.geom.w, height: p.geom.h, zIndex: p.z } : { zIndex: p.z }

  return (
    <section
      className={`window${p.active ? ' active' : ''}${p.maximized ? ' maximized' : ''}${p.dialog ? ' dialog' : ''}`}
      style={style}
      onPointerDownCapture={p.onFocus}
      aria-label={p.title}
      hidden={p.hidden}
    >
      <header className="titlebar" onPointerDown={onDrag} onDoubleClick={() => !p.dialog && p.onToggleMax()}>
        <Icon name={p.icon} size={16} className="title-icon" />
        <span className="title-text">{p.title}</span>
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
              />
            </>
          )}
          <button type="button" className="cap close" aria-label="Close" title="Close" onClick={p.onClose} />
        </div>
      </header>
      <div className="window-body">{p.children}</div>
      {free && !p.dialog && <div className="resize-grip" onPointerDown={onResize} />}
    </section>
  )
}
